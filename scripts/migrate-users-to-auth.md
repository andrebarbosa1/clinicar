# Migração de usuários para Firebase Authentication

> Não execute esta migração em produção sem backup e sem validar as regras no Firebase Emulator.

## Objetivo

Eliminar credenciais (`password`) da coleção `users` e usar Firebase Authentication como fonte de identidade.

## Fluxo recomendado

1. Ative **Authentication → Sign-in method → Email/Password** no projeto Firebase.
2. Faça um backup/export dos documentos `users`.
3. Para cada usuário válido, crie um usuário no Firebase Authentication usando um ambiente administrativo seguro (Firebase Admin SDK). **Nunca coloque Admin SDK credentials no frontend.**
4. Salve o UID retornado no perfil do usuário e em `users_by_uid/{uid}`.
5. Remova o campo `password` dos documentos `users`.
6. Migre o login do frontend para `signInWithEmailAndPassword`.
7. Faça o frontend carregar o perfil por `users_by_uid/{request.auth.uid}`.
8. Adicione `clinicId` aos perfis e aos documentos clínicos para isolamento multi-tenant.
9. Teste login, logout, recuperação de senha, permissões e regras no Emulator.
10. Somente depois publique as Firestore Rules restritivas.

## Regras importantes

- Não migre senhas em texto puro para outro banco.
- Não faça hashing manual no frontend para substituir Firebase Authentication.
- Não use uma senha administrativa fixa no código-fonte.
- Não use `users` como mecanismo de autenticação.
- O `uid` do Firebase Authentication deve ser a identidade confiável.

## Pós-migração

Depois que todos os usuários estiverem autenticados pelo Firebase Authentication, remova do frontend toda lógica que compare `user.password` e remova os campos `password` dos documentos Firestore.
