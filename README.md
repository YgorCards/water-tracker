# Gota

Aplicação web para acompanhar a hidratação diária. Criada com React, TypeScript, Vite, Tailwind CSS e Firebase.

## Rodar localmente

```bash
npm install
npm run dev
```

O Vite disponibiliza o app em `http://localhost:5173`.

## Firebase (opcional durante o desenvolvimento)

Sem credenciais, o app salva as configurações e os registros do dia no `localStorage` do navegador. Para sincronizar pelo Cloud Firestore:

1. Crie um projeto no Firebase e um banco Firestore.
2. Ative o provedor **Anonymous** em Authentication → Sign-in method.
3. Copie `.env.example` para `.env` e preencha os valores do app Web do Firebase.
4. Publique `firestore.rules` no Firestore Rules.
5. Reinicie o servidor do Vite.

O app cria uma conta anônima por navegador e grava configurações em `users/{uid}` e registros diários em `users/{uid}/days/{YYYY-MM-DD}`. Para trocar entre aparelhos, será necessário adicionar um fluxo de login com conta; contas anônimas são vinculadas ao dispositivo até serem vinculadas a um provedor.

## Scripts

- `npm run dev` inicia o servidor local.
- `npm run build` compila o TypeScript e gera a versão de produção em `dist/`.
- `npm run preview` serve localmente a versão compilada.

Na Vercel, importe o repositório e configure as mesmas variáveis `VITE_FIREBASE_*` nas configurações do projeto para habilitar a sincronização.
# water-tracker
