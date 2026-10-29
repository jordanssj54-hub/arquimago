(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};
    var auth = null;
    var db = null;
    var currentUser = null;
    var cloudWriteTimer = null;
    var pendingCloudState = null;
    var cloudWriteInFlight = false;
    var lastCloudError = "";
    var authMode = "landing";
    var pendingRegistrationProfile = null;
    var activeProfile = null;
    var LEGACY_MIGRATION_KEY = "arquimago_legacy_migration_uid_v1";
    var CLOUD_COLLECTION = "users";
    var CLOUD_SCHEMA_VERSION = 1;

    function clone(value) {
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (e) {
            return value;
        }
    }

    function sanitizeForFirestore(value, stack, depth) {
        depth = depth || 0;
        if (value === undefined || typeof value === "function" || typeof value === "symbol") return undefined;
        if (value === null || typeof value === "string" || typeof value === "boolean") return value;
        if (typeof value === "number") return isFinite(value) ? value : null;
        if (value instanceof Date) return value.toISOString();
        if (depth > 40) return undefined;

        stack = stack || [];
        if (stack.indexOf(value) !== -1) return undefined;
        stack.push(value);

        var result;
        if (Array.isArray(value)) {
            result = value.map(function (item) {
                var sanitized = sanitizeForFirestore(item, stack, depth + 1);
                return sanitized === undefined ? null : sanitized;
            });
        } else {
            result = {};
            Object.keys(value).forEach(function (key) {
                var sanitized = sanitizeForFirestore(value[key], stack, depth + 1);
                if (sanitized !== undefined) result[key] = sanitized;
            });
        }
        stack.pop();
        return result;
    }

    function nonEmpty(first, second, fallback) {
        var values = [first, second, fallback];
        for (var i = 0; i < values.length; i++) {
            if (values[i] !== undefined && values[i] !== null && String(values[i]).trim()) return String(values[i]).trim();
        }
        return "";
    }

    function mergeUserProfile(user, remoteProfile, pendingProfile) {
        remoteProfile = remoteProfile || {};
        pendingProfile = pendingProfile || {};
        return {
            uid: String(user.uid),
            displayName: nonEmpty(user.displayName, remoteProfile.displayName, pendingProfile.fullName),
            fullName: nonEmpty(pendingProfile.fullName, remoteProfile.fullName, user.displayName),
            email: nonEmpty(user.email, remoteProfile.email, ""),
            birthDate: nonEmpty(pendingProfile.birthDate, remoteProfile.birthDate, ""),
            photoURL: nonEmpty(user.photoURL, remoteProfile.photoURL, ""),
            createdAt: remoteProfile.createdAt || null
        };
    }

    function applyProfileToState(state, profile) {
        var displayName = profile && (profile.displayName || profile.fullName);
        if (displayName && !String(state.name || "").trim()) state.name = displayName;
        var hasPersonalizedAvatar = !!(state.customAvatar && state.avatarProvider !== "google");
        if (profile && profile.photoURL && !hasPersonalizedAvatar) {
            state.customAvatar = profile.photoURL;
            state.avatarProvider = "google";
        }
        return state;
    }

    function isAuthSessionError(error) {
        var code = error && error.code ? String(error.code) : "";
        return code === "unauthenticated" ||
            code.indexOf("auth/user-token-expired") !== -1 ||
            code.indexOf("auth/invalid-user-token") !== -1 ||
            code.indexOf("auth/user-disabled") !== -1 ||
            code.indexOf("auth/user-not-found") !== -1;
    }

    function configured() {
        var config = global.ARQUIMAGO_FIREBASE_CONFIG || {};
        return !!(global.firebase && config.apiKey && config.projectId &&
            String(config.apiKey).indexOf("COLE_AQUI_") !== 0 &&
            String(config.projectId).indexOf("SEU_") !== 0);
    }

    function authErrorMessage(error) {
        var code = error && error.code ? String(error.code) : "";
        if (code.indexOf("popup-closed-by-user") !== -1) return "A janela do Google foi fechada.";
        if (code.indexOf("popup-blocked") !== -1) return "O navegador bloqueou a janela do Google. Permita pop-ups e tente novamente.";
        if (code.indexOf("unauthorized-domain") !== -1) return "Este dominio ainda nao esta autorizado no Firebase Console.";
        if (code.indexOf("operation-not-allowed") !== -1) return "O login Google ainda nao foi ativado no Firebase Console.";
        if (code.indexOf("email-already-in-use") !== -1) return "Este e-mail ja possui uma conta. Use Entrar ou recupere sua senha.";
        if (code.indexOf("account-exists-with-different-credential") !== -1) return "Este e-mail ja possui uma conta com outro metodo de login. Nenhum provedor foi vinculado automaticamente.";
        if (code.indexOf("invalid-email") !== -1) return "Informe um e-mail valido.";
        if (code.indexOf("invalid-credential") !== -1) return "As credenciais informadas nao sao validas.";
        if (code.indexOf("user-not-found") !== -1 || code.indexOf("wrong-password") !== -1 || code.indexOf("invalid-login-credentials") !== -1) return "E-mail ou senha incorretos.";
        if (code.indexOf("weak-password") !== -1) return "A senha precisa ter pelo menos 8 caracteres.";
        if (code.indexOf("too-many-requests") !== -1) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
        if (code.indexOf("invalid-signup") !== -1) return error && error.message ? error.message : "Confira os dados do cadastro.";
        if (code.indexOf("network-request-failed") !== -1) return "Nao foi possivel conectar ao Firebase. Verifique sua internet.";
        return "Nao foi possivel concluir esta operacao. Tente novamente.";
    }

    function syncErrorMessage(error) {
        var code = error && error.code ? String(error.code) : "";
        if (code.indexOf("permission-denied") !== -1) {
            return "O Firestore recusou o acesso. Confira as regras users/{uid} e o UID da sessao.";
        }
        if (code.indexOf("unauthenticated") !== -1) {
            return "A sessao Google expirou antes da sincronizacao. Entre novamente.";
        }
        if (code.indexOf("failed-precondition") !== -1) {
            return "O banco Firestore ainda nao esta disponivel. Crie o banco no projeto correto.";
        }
        if (code.indexOf("unavailable") !== -1 || code.indexOf("network-request-failed") !== -1) {
            return "Nao foi possivel conectar ao Firestore. Verifique a rede e o dominio autorizado.";
        }
        if (code.indexOf("resource-exhausted") !== -1) {
            return "O limite do Firestore foi atingido. O progresso local foi preservado.";
        }
        if (code.indexOf("invalid-argument") !== -1) {
            return "Os dados do progresso possuem um valor que o Firestore nao aceita. O progresso local foi preservado.";
        }
        return "Nao foi possivel sincronizar sua jornada com o Firestore. O progresso local foi preservado.";
    }

    function setAuthGateStatus(message, isError) {
        var status = document.getElementById("authGateStatus");
        if (!status) return;
        status.textContent = message || "";
        status.classList.toggle("is-error", !!isError);
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function authPolicy() {
        return Arquimago.AUTH_POLICY || {
            minimumAge: null,
            storeBirthDate: false,
            legalDocumentsAvailable: false,
            termsUrl: "",
            privacyUrl: ""
        };
    }

    function legalDocumentLabel() {
        var policy = authPolicy();
        if (policy.legalDocumentsAvailable && policy.termsUrl && policy.privacyUrl) {
            return '<a href="' + escapeHtml(policy.termsUrl) + '" target="_blank" rel="noopener">Termos de Uso</a> e <a href="' + escapeHtml(policy.privacyUrl) + '" target="_blank" rel="noopener">Politica de Privacidade</a>';
        }
        return '<span class="auth-gate__legal-placeholder">Termos de Uso</span> e <span class="auth-gate__legal-placeholder">Politica de Privacidade</span>';
    }

    function authModeMarkup(mode) {
        if (mode === "signup") {
            return '<div class="auth-gate__heading"><p class="auth-gate__eyebrow">NOVA JORNADA</p><h2 id="authGateTitle">Criar conta</h2><p>Guarde sua evolucao e continue de onde parou.</p></div>' +
                '<form class="auth-gate__form" id="authSignUpForm" novalidate>' +
                    '<label>Nome completo<input id="authFullNameInput" name="fullName" type="text" autocomplete="name" maxlength="100" required></label>' +
                    '<label>Data de nascimento<input id="authBirthDateInput" name="birthDate" type="date" autocomplete="bday" required></label>' +
                    '<label>E-mail<input id="authEmailInput" name="email" type="email" autocomplete="email" required></label>' +
                    '<label>Senha<input id="authPasswordInput" name="password" type="password" autocomplete="new-password" minlength="8" required><small>Use pelo menos 8 caracteres. Uma combinacao de letras e numeros e recomendada.</small></label>' +
                    '<label>Confirmar senha<input id="authPasswordConfirmInput" name="passwordConfirm" type="password" autocomplete="new-password" minlength="8" required></label>' +
                    '<label class="auth-gate__consent"><input id="authLegalConsent" name="legalConsent" type="checkbox" required><span>Li e aceito os ' + legalDocumentLabel() + '.</span></label>' +
                    '<button type="submit" class="btn-primary auth-gate__submit" id="authSignUpButton">CRIAR CONTA</button>' +
                '</form>' +
                '<p class="auth-gate__policy-note">A politica de idade precisa ser configurada antes de liberar o cadastro.</p>' +
                '<button type="button" class="auth-gate__link" data-auth-mode="signin">Ja tenho uma conta — Entrar</button>' +
                '<button type="button" class="auth-gate__back" data-auth-mode="landing">Voltar</button>';
        }

        if (mode === "signin") {
            return '<div class="auth-gate__heading"><p class="auth-gate__eyebrow">RETOMAR JORNADA</p><h2 id="authGateTitle">Entrar</h2><p>Use seu e-mail e senha para continuar.</p></div>' +
                '<form class="auth-gate__form" id="authSignInForm" novalidate>' +
                    '<label>E-mail<input id="authEmailInput" name="email" type="email" autocomplete="email" required></label>' +
                    '<label>Senha<input id="authPasswordInput" name="password" type="password" autocomplete="current-password" required></label>' +
                    '<button type="submit" class="btn-primary auth-gate__submit" id="authSignInButton">ENTRAR</button>' +
                '</form>' +
                '<button type="button" class="auth-gate__link" id="authForgotPasswordButton">Esqueci minha senha</button>' +
                '<button type="button" class="auth-gate__google auth-gate__google--compact" id="googleSignInButton"><span aria-hidden="true">G</span> CONTINUAR COM GOOGLE</button>' +
                '<button type="button" class="auth-gate__back" data-auth-mode="landing">Voltar</button>';
        }

        if (mode === "reset") {
            return '<div class="auth-gate__heading"><p class="auth-gate__eyebrow">RECUPERAR ACESSO</p><h2 id="authGateTitle">Redefinir senha</h2><p>Enviaremos um link para o e-mail da sua conta.</p></div>' +
                '<form class="auth-gate__form" id="authResetForm" novalidate>' +
                    '<label>E-mail<input id="authEmailInput" name="email" type="email" autocomplete="email" required></label>' +
                    '<button type="submit" class="btn-primary auth-gate__submit" id="authResetButton">ENVIAR LINK</button>' +
                '</form>' +
                '<button type="button" class="auth-gate__back" data-auth-mode="signin">Voltar para entrar</button>';
        }

        return '<div class="auth-gate__heading"><p class="auth-gate__eyebrow">O RECOMECO</p><h1 id="authGateTitle">ARQUIMAGO</h1><p>Guarde sua jornada e continue em qualquer dispositivo.</p></div>' +
            '<button type="button" class="auth-gate__google btn-primary" id="googleSignInButton"><span aria-hidden="true">G</span> CONTINUAR COM GOOGLE</button>' +
            '<span class="auth-gate__or">ou</span>' +
            '<button type="button" class="auth-gate__secondary" data-auth-mode="signup">CRIAR CONTA</button>' +
            '<p class="auth-gate__switch">Ja tem uma conta? <button type="button" class="auth-gate__link" data-auth-mode="signin">Entrar</button></p>';
    }

    function setAuthBusy(busy) {
        var gate = document.getElementById("authGate");
        if (!gate) return;
        gate.querySelectorAll("button, input").forEach(function (element) {
            element.disabled = !!busy;
        });
    }

    function handleAuthResult(result) {
        if (result && result.user && Arquimago.onFirebaseUserChanged) Arquimago.onFirebaseUserChanged(result.user);
    }

    function handleGoogleFailure(error) {
        setAuthBusy(false);
        if (error && String(error.code || "").indexOf("account-exists-with-different-credential") !== -1) {
            var email = error.email;
            if (email && auth && auth.fetchSignInMethodsForEmail) {
                auth.fetchSignInMethodsForEmail(email).then(function (methods) {
                    var methodMessage = methods.indexOf("password") !== -1 ? " Entre com e-mail e senha para usar a conta existente." : " Use o metodo de login ja vinculado a essa conta.";
                    Arquimago.showAuthGate(authErrorMessage(error) + methodMessage, "signin");
                }).catch(function () {
                    Arquimago.showAuthGate(authErrorMessage(error), "signin");
                });
                return;
            }
            Arquimago.showAuthGate(authErrorMessage(error), "signin");
            return;
        }
        setAuthGateStatus(authErrorMessage(error), true);
    }

    function emailIsValid(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
    }

    function parseBirthDate(value) {
        var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
        if (!match) return null;
        var date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        if (date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3])) return null;
        var today = new Date();
        today.setHours(23, 59, 59, 999);
        if (date > today) return null;
        return date;
    }

    function validateSignupData(data) {
        var policy = authPolicy();
        if (!String(data.fullName || "").trim()) return "Informe seu nome completo.";
        if (!emailIsValid(data.email)) return "Informe um e-mail valido.";
        if (String(data.password || "").length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
        if (data.password !== data.passwordConfirm) return "As senhas nao coincidem.";
        if (!parseBirthDate(data.birthDate)) return "Informe uma data de nascimento valida e que nao seja futura.";
        if (policy.minimumAge === null || policy.minimumAge === undefined) return "O cadastro aguarda a configuracao da politica de idade do aplicativo.";
        if (!isFinite(Number(policy.minimumAge)) || Number(policy.minimumAge) < 0) return "A politica de idade do aplicativo esta configurada incorretamente.";
        var birthDate = parseBirthDate(data.birthDate);
        var cutoff = new Date();
        cutoff.setHours(23, 59, 59, 999);
        cutoff.setFullYear(cutoff.getFullYear() - Number(policy.minimumAge));
        if (birthDate > cutoff) return "O cadastro nao atende a idade minima configurada.";
        if (!data.legalConsent) return "Aceite os Termos de Uso e a Politica de Privacidade para continuar.";
        if (!policy.legalDocumentsAvailable || !policy.termsUrl || !policy.privacyUrl) return "Os documentos legais ainda nao foram configurados para o cadastro.";
        return "";
    }

    function bindAuthScreen(message) {
        var root = document.getElementById("intro-root");
        if (!root) return;
        root.querySelectorAll("[data-auth-mode]").forEach(function (button) {
            button.addEventListener("click", function () {
                Arquimago.showAuthGate("", button.getAttribute("data-auth-mode"));
            });
        });

        var googleButton = document.getElementById("googleSignInButton");
        if (googleButton) googleButton.addEventListener("click", function () {
            setAuthBusy(true);
            setAuthGateStatus("Abrindo o Google...");
            Arquimago.signInWithGoogle().then(handleAuthResult).catch(function (error) {
                handleGoogleFailure(error);
            });
        });

        var signInForm = document.getElementById("authSignInForm");
        if (signInForm) signInForm.addEventListener("submit", function (event) {
            event.preventDefault();
            var email = document.getElementById("authEmailInput").value.trim();
            var password = document.getElementById("authPasswordInput").value;
            if (!emailIsValid(email)) return setAuthGateStatus("Informe um e-mail valido.", true);
            if (!password) return setAuthGateStatus("Informe sua senha.", true);
            setAuthBusy(true);
            setAuthGateStatus("Entrando...");
            Arquimago.signInWithEmail(email, password).then(function (result) {
                setAuthBusy(false);
                handleAuthResult(result);
            }).catch(function (error) {
                setAuthBusy(false);
                setAuthGateStatus(authErrorMessage(error), true);
            });
        });

        var signUpForm = document.getElementById("authSignUpForm");
        if (signUpForm) signUpForm.addEventListener("submit", function (event) {
            event.preventDefault();
            var data = {
                fullName: document.getElementById("authFullNameInput").value.trim(),
                birthDate: document.getElementById("authBirthDateInput").value,
                email: document.getElementById("authEmailInput").value.trim(),
                password: document.getElementById("authPasswordInput").value,
                passwordConfirm: document.getElementById("authPasswordConfirmInput").value,
                legalConsent: document.getElementById("authLegalConsent").checked
            };
            var validationError = validateSignupData(data);
            if (validationError) return setAuthGateStatus(validationError, true);
            setAuthBusy(true);
            setAuthGateStatus("Criando sua conta...");
            Arquimago.createEmailAccount(data).then(function (result) {
                setAuthBusy(false);
                handleAuthResult(result);
            }).catch(function (error) {
                setAuthBusy(false);
                setAuthGateStatus(authErrorMessage(error), true);
            });
        });

        var resetForm = document.getElementById("authResetForm");
        if (resetForm) resetForm.addEventListener("submit", function (event) {
            event.preventDefault();
            var email = document.getElementById("authEmailInput").value.trim();
            if (!emailIsValid(email)) return setAuthGateStatus("Informe um e-mail valido.", true);
            setAuthBusy(true);
            setAuthGateStatus("Enviando instrucoes...");
            Arquimago.resetEmailPassword(email).then(function () {
                setAuthBusy(false);
                setAuthGateStatus("Se houver uma conta para este e-mail, enviaremos um link de redefinicao.");
            }).catch(function (error) {
                setAuthBusy(false);
                setAuthGateStatus(authErrorMessage(error), true);
            });
        });

        var forgotButton = document.getElementById("authForgotPasswordButton");
        if (forgotButton) forgotButton.addEventListener("click", function () {
            Arquimago.showAuthGate("", "reset");
        });
    }

    Arquimago.showAuthGate = function (message, mode) {
        var root = document.getElementById("intro-root");
        if (!root) return;

        authMode = mode || "landing";
        document.body.classList.add("auth-active");
        root.innerHTML =
            '<div class="auth-gate" id="authGate">' +
                '<div class="auth-gate__panel" role="dialog" aria-labelledby="authGateTitle">' +
                    '<div class="auth-gate__seal" aria-hidden="true">✦</div>' +
                    authModeMarkup(authMode) +
                    '<p class="auth-gate__status" id="authGateStatus" role="status" aria-live="polite">' + escapeHtml(message || "") + '</p>' +
                    (authMode === "landing" ? '<button type="button" class="auth-gate__offline" id="continueOfflineButton">Continuar sem conta neste dispositivo</button><p class="auth-gate__note">Sem login, o progresso continua salvo apenas neste navegador.</p>' : '') +
                    '<p class="auth-gate__legal">' + legalDocumentLabel() + '</p>' +
                '</div>' +
            '</div>';

        var offlineButton = document.getElementById("continueOfflineButton");
        if (offlineButton) offlineButton.addEventListener("click", function () {
            if (Arquimago.onContinueOffline) Arquimago.onContinueOffline();
        });
        bindAuthScreen(message);
    };

    Arquimago.setAuthGateStatus = setAuthGateStatus;

    Arquimago.initFirebase = function () {
        if (!configured()) {
            return Promise.resolve({ configured: false, user: null });
        }

        try {
            if (!global.firebase.apps.length) global.firebase.initializeApp(global.ARQUIMAGO_FIREBASE_CONFIG);
            auth = global.firebase.auth();
            db = global.firebase.firestore();
            Arquimago.firebaseConfigured = true;
        } catch (error) {
            console.error("Falha ao inicializar o Firebase", error);
            return Promise.resolve({ configured: false, user: null, error: error });
        }

        var persistence = auth.setPersistence ? auth.setPersistence(global.firebase.auth.Auth.Persistence.LOCAL) : Promise.resolve();
        return Promise.resolve(persistence).catch(function (error) {
            console.warn("Nao foi possivel ativar a persistencia local do Firebase", error);
        }).then(function () {
            return new Promise(function (resolve) {
                var firstChange = true;
                auth.onAuthStateChanged(function (user) {
                    currentUser = user || null;
                    Arquimago.firebaseUser = currentUser;
                    if (!currentUser) {
                        activeProfile = null;
                        pendingCloudState = null;
                        if (cloudWriteTimer) clearTimeout(cloudWriteTimer);
                        cloudWriteTimer = null;
                    }
                    if (firstChange) {
                        firstChange = false;
                        resolve({ configured: true, user: currentUser });
                        return;
                    }
                    if (Arquimago.onFirebaseUserChanged) Arquimago.onFirebaseUserChanged(currentUser);
                });
            });
        });
    };

    Arquimago.signInWithGoogle = function () {
        if (!auth) return Promise.reject(new Error("Firebase nao configurado."));
        var provider = new global.firebase.auth.GoogleAuthProvider();
        return auth.signInWithPopup(provider);
    };

    Arquimago.signOutFirebase = function () {
        if (!auth) return Promise.resolve();
        return auth.signOut();
    };

    Arquimago.signInWithEmail = function (email, password) {
        if (!auth) return Promise.reject(new Error("Firebase nao configurado."));
        return auth.signInWithEmailAndPassword(String(email || "").trim(), String(password || ""));
    };

    Arquimago.resetEmailPassword = function (email) {
        if (!auth) return Promise.reject(new Error("Firebase nao configurado."));
        return auth.sendPasswordResetEmail(String(email || "").trim());
    };

    Arquimago.createEmailAccount = function (data) {
        if (!auth) return Promise.reject(new Error("Firebase nao configurado."));
        var validationError = validateSignupData(data || {});
        if (validationError) return Promise.reject({ code: "auth/invalid-signup", message: validationError });

        var policy = authPolicy();
        pendingRegistrationProfile = {
            fullName: String(data.fullName || "").trim(),
            birthDate: policy.storeBirthDate ? String(data.birthDate || "") : ""
        };
        var created = false;
        return auth.createUserWithEmailAndPassword(String(data.email || "").trim(), String(data.password || ""))
            .then(function (credential) {
                created = true;
                if (!credential.user || !credential.user.updateProfile) return credential;
                return credential.user.updateProfile({ displayName: pendingRegistrationProfile.fullName }).then(function () {
                    return credential;
                });
            }).catch(function (error) {
                if (!created) pendingRegistrationProfile = null;
                throw error;
            });
    };

    function itemKey(item, index) {
        if (item == null) return "null_" + index;
        if (typeof item !== "object") return String(item);
        return String(item.id || item.date || item.month || item.key || JSON.stringify(item));
    }

    function mergeArray(remoteList, localList, keyFn) {
        var result = Array.isArray(remoteList) ? clone(remoteList) : [];
        (Array.isArray(localList) ? localList : []).forEach(function (item, index) {
            var key = keyFn ? keyFn(item, index) : itemKey(item, index);
            var found = -1;
            for (var i = 0; i < result.length; i++) {
                if ((keyFn ? keyFn(result[i], i) : itemKey(result[i], i)) === key) {
                    found = i;
                    break;
                }
            }
            if (found === -1) result.push(clone(item));
            else if (keyFn && (keyFn === historyKey || keyFn === trophyKey)) result[found] = mergeHistory(result[found], item);
            else result[found] = clone(item);
        });
        return result;
    }

    function historyKey(item) {
        return item && (item.date || item.month) || itemKey(item, 0);
    }

    function trophyKey(item) {
        return item && (item.id || item.name) || itemKey(item, 0);
    }

    function mergeHistory(remoteItem, localItem) {
        var result = clone(remoteItem || {});
        Object.keys(localItem || {}).forEach(function (key) {
            var localValue = localItem[key];
            if (typeof localValue === "number" && typeof result[key] === "number") {
                result[key] = Math.max(result[key], localValue);
            } else if (localValue !== undefined) {
                result[key] = clone(localValue);
            }
        });
        return result;
    }

    function mergeMap(remoteMap, localMap, numericMode) {
        var result = {};
        Object.keys(remoteMap || {}).forEach(function (key) { result[key] = clone(remoteMap[key]); });
        Object.keys(localMap || {}).forEach(function (key) {
            if (numericMode && typeof result[key] === "number" && typeof localMap[key] === "number") {
                result[key] = Math.max(result[key], localMap[key]);
            } else {
                result[key] = clone(localMap[key]);
            }
        });
        return result;
    }

    function chooseText(localValue, remoteValue, defaultValue) {
        if (localValue !== undefined && localValue !== null && localValue !== "" && localValue !== defaultValue) return clone(localValue);
        return clone(remoteValue !== undefined ? remoteValue : localValue);
    }

    function recalculateFinance(fin) {
        var saldo = Number(fin.saldoInicial) || 0;
        var guardado = Number(fin.guardadoInicial) || 0;
        (fin.transacoes || []).slice().sort(function (a, b) {
            if (a.data !== b.data) return a.data < b.data ? -1 : 1;
            return (a.seq || 0) - (b.seq || 0);
        }).forEach(function (transaction) {
            var value = Number(transaction.valor) || 0;
            if (transaction.tipo === "entrada") saldo += value;
            if (transaction.tipo === "saida") saldo -= value;
            if (transaction.tipo === "guardado_entrada") guardado += value;
            if (transaction.tipo === "guardado_saida") guardado -= value;
            if (transaction.tipo === "transferencia_saldo_guardado") { saldo -= value; guardado += value; }
            if (transaction.tipo === "transferencia_guardado_saldo") { guardado -= value; saldo += value; }
        });
        fin.saldo = saldo;
        fin.guardado = guardado;
    }

    function mergeState(localState, remoteState) {
        var defaults = Arquimago.DEFAULT_STATE || {};
        var local = clone(localState || {});
        var remote = clone(remoteState || {});
        var result = clone(remote);
        var numericMax = ["level", "xp", "totalXP", "missionsCompleted", "missionsCompletedForLevel", "xpCompletedForLevel", "playTimeSeconds", "dailyXP", "dailyAvailableXP", "monthlyXP", "monthlyAvailableXP", "monthlyGoalXP", "daysUsingApp", "bestDailyRankPercent"];
        var booleanUnion = ["introSeen", "soundEnabled"];
        var arrayFields = ["completedIds", "dailyCompletedMissionIds", "dailyDone", "weeklyDone", "habitsDone", "bossDamageEvents", "bossTrophies", "pendingClassChanges"];

        Object.keys(defaults).forEach(function (key) {
            if (numericMax.indexOf(key) !== -1) {
                result[key] = Math.max(Number(remote[key]) || 0, Number(local[key]) || 0);
            } else if (booleanUnion.indexOf(key) !== -1) {
                result[key] = key === "soundEnabled" ? (local[key] !== false && remote[key] !== false) : !!(local[key] || remote[key]);
            } else if (arrayFields.indexOf(key) !== -1) {
                result[key] = mergeArray(remote[key], local[key], key === "bossTrophies" ? trophyKey : null);
            } else if (key === "dailyHistory" || key === "monthlyHistory") {
                result[key] = mergeArray(remote[key], local[key], historyKey);
            } else if (key === "customMissions" || key === "grimoireData") {
                result[key] = mergeArray(remote[key], local[key], function (item, index) { return item && item.id || itemKey(item, index); });
            } else if (key === "missionCompletionCounts") {
                result[key] = mergeMap(remote[key], local[key], true);
            } else if (key === "missionOverrides" || key === "grimoireFavs") {
                result[key] = mergeMap(remote[key], local[key], false);
            } else if (key === "attributes") {
                result[key] = mergeMap(remote[key], local[key], false);
                Object.keys(defaults.attributes || {}).forEach(function (attribute) {
                    var remoteAttribute = (remote.attributes || {})[attribute] || {};
                    var localAttribute = (local.attributes || {})[attribute] || {};
                    result[key][attribute] = {
                        level: Math.max(Number(remoteAttribute.level) || 1, Number(localAttribute.level) || 1),
                        progress: Math.max(Number(remoteAttribute.progress) || 0, Number(localAttribute.progress) || 0),
                        total: Math.max(Number(remoteAttribute.total) || 0, Number(localAttribute.total) || 0)
                    };
                });
            } else if (key === "financas") {
                var remoteFinance = remote.financas || {};
                var localFinance = local.financas || {};
                result.financas = mergeMap(remoteFinance, localFinance, false);
                result.financas.despesas = mergeArray(remoteFinance.despesas, localFinance.despesas, function (item, index) { return item && item.id || itemKey(item, index); });
                result.financas.transacoes = mergeArray(remoteFinance.transacoes, localFinance.transacoes, function (item, index) { return item && item.id || itemKey(item, index); });
                result.financas.saldoInicial = localFinance.saldoInicial || remoteFinance.saldoInicial || 0;
                result.financas.guardadoInicial = localFinance.guardadoInicial || remoteFinance.guardadoInicial || 0;
                recalculateFinance(result.financas);
            } else {
                result[key] = chooseText(local[key], remote[key], defaults[key]);
            }
        });

        if (Arquimago.normalizeState) Arquimago.normalizeState(result);
        if (Arquimago.syncDates) Arquimago.syncDates(result);
        return result;
    }

    function hasMeaningfulState(state) {
        if (!state) return false;
        return !!(state.name || state.introSeen || Number(state.level) > 1 || Number(state.totalXP) > 0 ||
            Number(state.missionsCompleted) > 0 || (state.completedIds || []).length ||
            (state.customMissions || []).length || (state.dailyHistory || []).length ||
            (state.grimoireData || []).length || !!state.customAvatar ||
            (state.financas && ((state.financas.transacoes || []).length || (state.financas.despesas || []).length)));
    }

    function cloudDocument(state) {
        var profile = arguments.length > 1 ? arguments[1] : activeProfile;
        var safeState = sanitizeForFirestore(state) || {};
        var safeProfile = profile || {};
        var profileData = {
            uid: String(safeProfile.uid || ""),
            displayName: String(safeProfile.displayName || ""),
            fullName: String(safeProfile.fullName || ""),
            email: String(safeProfile.email || ""),
            birthDate: String(safeProfile.birthDate || ""),
            photoURL: String(safeProfile.photoURL || ""),
            createdAt: safeProfile.createdAt || global.firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: global.firebase.firestore.FieldValue.serverTimestamp()
        };
        return {
            schemaVersion: CLOUD_SCHEMA_VERSION,
            state: safeState,
            profile: profileData,
            updatedAt: global.firebase.firestore.FieldValue.serverTimestamp()
        };
    }

    function writeCloudState(state) {
        if (!db || !currentUser || !Arquimago.getStorageUser()) return Promise.resolve();
        return db.collection(CLOUD_COLLECTION).doc(currentUser.uid).set(cloudDocument(state, activeProfile), { merge: true });
    }

    Arquimago.connectFirebaseUser = function (user, legacyState) {
        if (!db || !user) return Promise.reject(new Error("Firebase nao inicializado."));

        var uid = String(user.uid);
        currentUser = user;
        Arquimago.firebaseUser = user;
        var scoped = Arquimago.readStoredState(uid);
        var migrationUid = "";
        try { migrationUid = localStorage.getItem(LEGACY_MIGRATION_KEY) || ""; } catch (e) {}
        var canMigrateLegacy = !migrationUid && !scoped.exists && hasMeaningfulState(legacyState);
        var localState = canMigrateLegacy ? clone(legacyState) : scoped.state;
        var fallbackState = localState;
        var fallbackProfile = null;

        var tokenReady = typeof user.getIdToken === "function" ? user.getIdToken() : Promise.resolve();
        return Promise.resolve(tokenReady).then(function () {
            return db.collection(CLOUD_COLLECTION).doc(uid).get();
        }).then(function (snapshot) {
            var remoteData = snapshot.exists && snapshot.data() ? snapshot.data() : {};
            var remoteState = remoteData.state || null;
            var state = remoteState ? mergeState(localState, remoteState) : localState;
            fallbackState = state;
            activeProfile = mergeUserProfile(user, remoteData.profile, pendingRegistrationProfile);
            fallbackProfile = activeProfile;
            applyProfileToState(state, activeProfile);
            Arquimago.setStorageUser(uid);
            Arquimago.state = state;
            Arquimago.saveState(state);
            return writeCloudState(state).then(function () {
                if (canMigrateLegacy) {
                    try { localStorage.setItem(LEGACY_MIGRATION_KEY, uid); } catch (e) {}
                    Arquimago.clearLegacyState();
                }
                pendingRegistrationProfile = null;
                lastCloudError = "";
                return state;
            });
        }).catch(function (error) {
            if (!isAuthSessionError(error)) {
                activeProfile = fallbackProfile || mergeUserProfile(user, {}, pendingRegistrationProfile);
                applyProfileToState(fallbackState, activeProfile);
                Arquimago.setStorageUser(uid);
                Arquimago.state = fallbackState;
                Arquimago.saveState(fallbackState);
                pendingRegistrationProfile = null;
                lastCloudError = error && error.message ? error.message : "Falha ao sincronizar.";
                return fallbackState;
            }
            Arquimago.setStorageUser("");
            throw error;
        });
    };

    function flushCloudState() {
        if (!pendingCloudState || cloudWriteInFlight || !currentUser || !db) return Promise.resolve();
        var state = pendingCloudState;
        pendingCloudState = null;
        cloudWriteInFlight = true;
        return writeCloudState(state).then(function () {
            lastCloudError = "";
        }).catch(function (error) {
            lastCloudError = error && error.message ? error.message : "Falha ao sincronizar.";
            console.error("Falha ao sincronizar o estado do Arquimago", error);
        }).then(function () {
            cloudWriteInFlight = false;
            if (pendingCloudState) return flushCloudState();
        });
    }

    Arquimago.queueCloudStateSave = function (state) {
        if (!currentUser || !db || !Arquimago.getStorageUser()) return;
        pendingCloudState = clone(state);
        if (cloudWriteTimer) clearTimeout(cloudWriteTimer);
        cloudWriteTimer = setTimeout(function () {
            cloudWriteTimer = null;
            flushCloudState();
        }, 500);
    };

    Arquimago.flushCloudState = flushCloudState;
    Arquimago.getFirebaseUser = function () { return currentUser; };
    Arquimago.getFirebaseErrorMessage = authErrorMessage;
    Arquimago.getFirebaseSyncErrorMessage = syncErrorMessage;

    function refreshAuthControls() {
        var card = document.getElementById("authAccountCard");
        var name = document.getElementById("authAccountName");
        var email = document.getElementById("authAccountEmail");
        var button = document.getElementById("authSignOutButton");
        if (!card || !button) return;
        var user = currentUser;
        card.hidden = !Arquimago.firebaseConfigured;
        if (name) name.textContent = user ? (user.displayName || "Conta Google") : "Jornada local";
        if (email) email.textContent = user ? (user.email || "") : "Entre para sincronizar seu progresso";
        button.textContent = user ? "Sair da conta Google" : "Entrar com Google";
        button.disabled = false;
    }

    Arquimago.refreshAuthControls = refreshAuthControls;

    Arquimago.initAuthControls = function () {
        var card = document.getElementById("authAccountCard");
        var button = document.getElementById("authSignOutButton");
        var drawerLogout = document.getElementById("drawerLogoutButton");
        if (!card || !button) return;
        refreshAuthControls();
        if (button.dataset.bound !== "true") {
            button.dataset.bound = "true";
            button.addEventListener("click", function () {
                button.disabled = true;
                if (currentUser) {
                    Arquimago.flushCloudState().then(function () {
                        return Arquimago.signOutFirebase();
                    }).catch(function (error) {
                        button.disabled = false;
                        if (Arquimago.showNotification) Arquimago.showNotification(authErrorMessage(error), "boss");
                    });
                    return;
                }
                Arquimago.signInWithGoogle().then(function (result) {
                    if (result && result.user && Arquimago.onFirebaseUserChanged) {
                        Arquimago.onFirebaseUserChanged(result.user);
                    }
                }).catch(function (error) {
                    button.disabled = false;
                    if (Arquimago.showNotification) Arquimago.showNotification(authErrorMessage(error), "boss");
                });
            });
        }

        if (drawerLogout && drawerLogout.dataset.bound !== "true") {
            drawerLogout.dataset.bound = "true";
            drawerLogout.addEventListener("click", function () {
                drawerLogout.disabled = true;
                if (!currentUser) {
                    drawerLogout.disabled = false;
                    if (Arquimago.showNotification) Arquimago.showNotification("Nenhuma conta conectada nesta jornada.", "boss");
                    return;
                }
                Arquimago.flushCloudState().then(function () {
                    return Arquimago.signOutFirebase();
                }).catch(function (error) {
                    drawerLogout.disabled = false;
                    if (Arquimago.showNotification) Arquimago.showNotification(authErrorMessage(error), "boss");
                });
            });
        }
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
