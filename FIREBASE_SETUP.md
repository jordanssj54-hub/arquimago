# Firebase no Arquimago

## 1. Criar e configurar o projeto

1. Acesse o [Firebase Console](https://console.firebase.google.com/) e crie um projeto.
2. Em **Authentication > Sign-in method**, ative os provedores **Google** e **Email/Password**.
3. Em **Authentication > Settings > Authorized domains**, adicione o dominio de desenvolvimento e o dominio publicado. Para testes locais, use `localhost`.
4. Em **Firestore Database**, crie o banco em modo de producao.
5. Publique as regras de `firestore.rules` na aba **Rules**.
6. Em **Project settings > General > Your apps**, registre um app da Web e copie a configuracao exibida.
7. Cole os valores em `js/firebase-config.js`.

A configuracao web do Firebase, incluindo `apiKey`, identifica o projeto, mas nao e um segredo. A protecao dos dados vem das regras do Firestore e da verificacao de autenticacao.

## 2. Estrutura dos dados

Cada jogador usa um documento separado:

```text
users/{uid}
  schemaVersion: 1
  profile: { uid, displayName, fullName, email, birthDate, photoURL, ... }
  state: { ...estado completo do Arquimago... }
  updatedAt: server timestamp
```

As regras permitem leitura e escrita somente quando o UID autenticado e igual ao ID do documento.

## 3. Como a migracao funciona

- Antes do primeiro login, o progresso continua em `localStorage` como antes.
- No primeiro login Google neste navegador, o estado local e mesclado ao documento do UID.
- Listas de missoes, habitos, conquistas, historicos, recompensas, trofeus, despesas e transacoes sao deduplicadas por identificador ou data.
- Contadores e progresso numerico usam o maior valor entre as fontes para evitar regressao.
- Depois da sincronizacao confirmada, o estado anonimo e removido do armazenamento global e fica salvo no armazenamento do UID.
- Cada UID usa uma chave local diferente, evitando que uma conta veja o estado de outra depois do logout.

## 4. Teste

Sirva o projeto por HTTP, em vez de abrir `index.html` diretamente. Por exemplo:

```bash
python -m http.server 5500
```

Abra `http://localhost:5500`, clique em **Entrar com Google** e confira:

1. O login abre uma janela Google e o app carrega normalmente.
2. Uma alteracao de XP ou missao aparece no documento `users/{uid}` do Firestore.
3. Ao recarregar a pagina, a sessao e mantida e o progresso continua presente.
4. Ao sair e entrar com outro Google, a outra conta nao recebe os dados da primeira.
5. Com o login desativado no Console, o app exibe erro sem apagar o estado local.
6. Ao clicar em **Continuar sem conta**, o comportamento local anterior permanece disponivel.

Para testar a seguranca, tente consultar no console ou no cliente um documento cujo ID seja diferente do UID autenticado. A regra deve negar a operacao.

## 5. Politica de idade e documentos legais

O cadastro por e-mail fica bloqueado enquanto `js/config.js` mantiver:

```js
minimumAge: null,
legalDocumentsAvailable: false
```

Antes de publicar o cadastro, o responsavel pelo produto precisa decidir a idade minima aplicavel, confirmar a politica de consentimento para menores e publicar os documentos juridicos. Depois, configure `minimumAge`, `legalDocumentsAvailable`, `termsUrl` e `privacyUrl` no mesmo arquivo. Nenhuma regra legal foi presumida pelo projeto.

Por privacidade, `storeBirthDate` esta desativado por padrao. A data e usada para validar o cadastro, mas nao e persistida no perfil enquanto essa opcao permanecer `false`.

## 6. Perfil e serializacao

O documento `users/{uid}` possui `profile` e `state`. Senhas nunca sao enviadas ao Firestore ou ao `localStorage`. O estado e sanitizado antes da gravacao para remover valores `undefined`, funcoes, referencias circulares e entidades que o Firestore nao suporta, evitando o erro `invalid-argument: Property state contains an invalid nested entity`.
