# Migração de autenticação — Clinicar

## Objetivo

O Clinicar deve usar Firebase Authentication para identidade e senha. Senhas não devem ser armazenadas ou comparadas em documentos Firestore.

## Estado atual

A aplicação ainda possui um fluxo legado que compara `username/password` com documentos da coleção `users`. Esse fluxo não deve ser considerado seguro para produção.

## Migração recomendada

1. No Firebase Console, habilite o provedor **Email/Password** em Authentication.
2. Crie/importa os usuários existentes no Firebase Authentication usando o SDK Admin ou o Console.
3. Para cada usuário, mantenha no Firestore apenas o perfil da aplicação (nome, função, módulos, clínica etc.) e associe-o ao `uid` do Firebase Authentication.
4. O frontend deve autenticar com `signInWithEmailAndPassword` e observar a sessão com `onAuthStateChanged`.
5. O documento `users_by_uid/{uid}` deve ser a ponte entre identidade Firebase e perfil do Clinicar.
6. Depois que os usuários estiverem migrados, remova o campo `password` dos documentos `users`.
7. Só então aplique as regras Firestore restritivas desta etapa.

## Importante

Não colocar credenciais administrativas, senhas padrão ou senhas de usuários no código-fonte. O Firebase Authentication deve ser a fonte de verdade para credenciais.

A documentação oficial do Firebase recomenda `createUserWithEmailAndPassword` para criação e `signInWithEmailAndPassword` para login por e-mail/senha, além de `onAuthStateChanged` para observar a sessão.

## Critério para liberar a próxima etapa

- [ ] Email/Password habilitado no Firebase
- [ ] Usuários existentes migrados
- [ ] Frontend usando Firebase Authentication
- [ ] `users.password` removido
- [ ] Todas as coleções clínicas protegidas por `request.auth`
- [ ] Isolamento por clínica/tenant implementado
- [ ] Testes de leitura/escrita não autenticada retornando `permission-denied`
