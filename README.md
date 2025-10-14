# Control+ Oficina

Painel completo para a gestao de oficinas mecanicas, com modulos de agenda, clientes, equipe tecnica, orcamentos, financeiro e controle de patio, integrado ao Firebase para autenticacao e persistencia de dados em tempo real.

## Principais recursos
- Dashboard com indicadores em tempo real (receita, agenda, ranking da equipe).
- Gestao de clientes, veiculos, profissionais e servicos.
- Agenda visual com status de ordens, checkout e emissao de lancamentos financeiros.
- Controle financeiro com lancamentos manuais e calculo automatico de repasses.
- Gestao de orcamentos, pecas e mao de obra.
- Controle de patio para veiculos em atendimento.
- Personalizacao de logomarca via painel de configuracoes.

## Stack
- [React 18](https://react.dev/)
- [Create React App 5](https://create-react-app.dev/)
- [Firebase (Authentication & Firestore)](https://firebase.google.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
- [Recharts](https://recharts.org/)

## Configuracao do ambiente

1. Certifique-se de ter **Node.js 18+** e **npm 9+** instalados.
2. Instale as dependencias:
   ```bash
   npm install
   ```
3. As credenciais do Firebase ja estao definidas diretamente em `src/firebase.js`. Ajuste o objeto `firebaseConfig` caso deseje apontar para outro projeto.

## Scripts disponiveis

| Comando | Descricao |
|---------|-----------|
| `npm start` | Inicia o servidor de desenvolvimento (porta 3000). |
| `npm run build` | Gera o bundle otimizado para producao em `build/`. |
| `npm test` | Executa a suite de testes em modo watch. |
| `npm run migrate:firestore` | Copia dados das colecoes `demo_*` para as colecoes finais. |

## Estrutura de dados (Firestore)

As colecoes utilizadas pelo painel:
- `clients`, `professionals`, `services`, `appointments`
- `transactions`, `budgets`, `yard`, `settings`

Para migrar dados existentes das colecoes `demo_*`, execute:
```bash
npm run migrate:firestore
```
> Necessario ter o Firebase CLI configurado ou rodar em ambiente com credenciais validas.

## Publicacao em producao

### 1. Build
```bash
npm run build
```
O diretorio `build/` contera os artefatos prontos para deploy.

### 2. Hospedagem recomendada
1. **Firebase Hosting**  
   - `firebase login`
   - `firebase init hosting`
   - Defina `build` como pasta publica e habilite SPA (rewrite para `/index.html`).
   - `firebase deploy`

2. **Vercel / Netlify**  
   - Vincule o repositorio.
   - Ajuste o arquivo `src/firebase.js` com as credenciais desejadas antes do deploy.
   - Comando de build: `npm run build`  
   - Diretorio de publicacao: `build`

3. **Static hosting (S3, CloudFront, etc.)**  
   - Faca upload do conteudo de `build/`.
   - Habilite redirect das rotas (SPA) para `index.html`.

### Checklist antes do deploy
- [ ] Certificados SSL e dominio configurados (se aplicavel).
- [ ] Regras de seguranca do Firestore revisadas.
- [ ] Configuracoes de autenticacao do Firebase ativadas (provedores de login).

## Manutencao e melhorias sugeridas
- Adicionar testes unitarios/mocks para os modulos que integram com Firebase.
- Considerar integrar Tailwind via PostCSS build ao inves de CDN para reduzir carregamento.
- Criar rotas de autenticacao (login/logout) e proteger o painel com `react-router`.
- Revisar regras de seguranca do Firestore para adequacao LGPD.
- Configurar pipelines de CI/CD (GitHub Actions) para build e deploy automatizado.

---

Feito com carinho para oficinas que precisam de controle total. Contribuicoes sao bem-vindas!







