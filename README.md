# Control+ Oficina

Painel completo para a gestão de oficinas mecânicas, com módulos de agenda, clientes, equipe técnica, orçamentos, financeiro e controle de pátio, integrado ao Firebase para autenticação e persistência de dados em tempo real.

## Principais recursos
- Dashboard com indicadores em tempo real (receita, agenda, ranking da equipe).
- Gestão de clientes, veículos, profissionais e serviços.
- Agenda visual com status de ordens, checkout e emissão de lançamentos financeiros.
- Controle financeiro com lançamentos manuais e cálculo automático de repasses.
- Gestão de orçamentos, peças e mão de obra.
- Controle de pátio para veículos em atendimento.
- Personalização de logomarca via painel de configurações.

## Stack
- [React 18](https://react.dev/)
- [Create React App 5](https://create-react-app.dev/)
- [Firebase (Authentication & Firestore)](https://firebase.google.com/)
- [Tailwind CSS via CDN](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
- [Recharts](https://recharts.org/)

## Configuração do ambiente

1. Certifique-se de ter **Node.js 18+** e **npm 9+** instalados.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Copie `.env.example` para `.env` e preencha com as credenciais do seu projeto Firebase:
   ```bash
   cp .env.example .env
   ```
   > Para ambientes de produção publique somente variáveis via pipeline/hosting e **nunca** comite o arquivo `.env`.

### Variáveis necessárias
| Variável | Descrição |
|----------|-----------|
| `REACT_APP_FIREBASE_API_KEY` | API Key do Firebase |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | domínio de autenticação |
| `REACT_APP_FIREBASE_PROJECT_ID` | ID do projeto |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | bucket de storage |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | sender id |
| `REACT_APP_FIREBASE_APP_ID` | app id |
| `REACT_APP_FIREBASE_MEASUREMENT_ID` | measurement id (Analytics) |

Caso algum valor não seja definido, o aplicativo usa o **fallback** incluso no código, adequado apenas para testes locais.

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm start` | Inicia o servidor de desenvolvimento (porta 3000). |
| `npm run build` | Gera o bundle otimizado para produção em `build/`. |
| `npm test` | Executa a suíte de testes em modo watch. |
| `npm run migrate:firestore` | Copia dados das coleções `demo_*` para as coleções finais. |

## Estrutura de dados (Firestore)

As coleções utilizadas pelo painel:
- `clients`, `professionals`, `services`, `appointments`
- `transactions`, `budgets`, `yard`, `settings`

Para migrar dados existentes das coleções `demo_*`, execute:
```bash
npm run migrate:firestore
```
> Necessário ter o Firebase CLI configurado ou rodar em ambiente com credenciais válidas.

## Publicação em produção

### 1. Build
```bash
npm run build
```
O diretório `build/` conterá os artefatos prontos para deploy.

### 2. Hospedagem recomendada
1. **Firebase Hosting**  
   - `firebase login`
   - `firebase init hosting`
   - Defina `build` como pasta pública e habilite SPA (rewrite para `/index.html`).
   - `firebase deploy`

2. **Vercel / Netlify**  
   - Vincule o repositório.
   - Configure as variáveis do Firebase no painel da plataforma.
   - Comando de build: `npm run build`  
   - Diretório de publicação: `build`

3. **Static hosting (S3, CloudFront, etc.)**  
   - Faça upload do conteúdo de `build/`.
   - Habilite redirect das rotas (SPA) para `index.html`.

### Checklist antes do deploy
- [ ] Variáveis `REACT_APP_FIREBASE_*` definidas na plataforma de hosting.
- [ ] Certificados SSL e domínio configurados (se aplicável).
- [ ] Regras de segurança do Firestore revisadas.
- [ ] Configurações de autenticação do Firebase ativadas (provedores de login).

## Manutenção e melhorias sugeridas
- Adicionar testes unitários/mocks para os módulos que integram com Firebase.
- Considerar integrar Tailwind via PostCSS build ao invés de CDN para reduzir carregamento.
- Criar rotas de autenticação (login/logout) e proteger o painel com `react-router`.
- Revisar regras de segurança do Firestore para adequação LGPD.
- Configurar pipelines de CI/CD (GitHub Actions) para build e deploy automatizado.

---

Feito com 💡 para oficinas que precisam de controle total. Contribuições são bem-vindas! 😉
