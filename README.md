# Sistema ATKDGV — Módulo Força Feminina

Sistema de gestão do Projeto Social Força Feminina da Associação de Taekwondo da Grande Vitória.

## 🚀 Stack Tecnológica

### Frontend
- **React 19** - Biblioteca JavaScript para construção de interfaces
- **Vite** - Build tool extremamente rápida
- **TypeScript** - Superset tipado do JavaScript
- **Shadcn UI** - Componentes reutilizáveis e acessíveis
- **Tailwind CSS** - Framework CSS utility-first
- **React Router** - Roteamento para aplicações React
- **React Hook Form** - Gerenciamento de formulários performático
- **Zod** - Validação de schemas TypeScript-first
- **Recharts** - Biblioteca de gráficos para React

### Backend (`backend/`)
- **Java 21 + Spring Boot 3** - API REST
- **Spring Security + JWT** - Autenticação e RBAC por perfil
- **Spring Data JPA / Hibernate** - Persistência
- **MySQL 8** - Banco de dados local `sistemaforca` (user `root`, senha `root`)

## 📋 Pré-requisitos

- Node.js 18+
- npm
- JDK 21 e Maven 3.9+
- MySQL 8 rodando localmente (o banco `sistemaforca` é criado automaticamente)

## 🔧 Instalação

```bash
npm install
```

## ⚙️ Backend

```bash
# Subir a API (porta 8085)
mvn -f backend/pom.xml spring-boot:run
```

Configuração do banco em [backend/src/main/resources/application.yml](backend/src/main/resources/application.yml).
O frontend aponta para a API via `VITE_API_URL` no arquivo `.env` (padrão `http://localhost:8085`).

Os dados de demonstração não são carregados por padrão. O perfil `seed` deve ser usado somente em
ambientes descartáveis de desenvolvimento.

## 💻 Scripts Disponíveis

### Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm start
# ou
npm run dev
```

Abre a aplicação em modo de desenvolvimento em [http://localhost:5173](http://localhost:5173).

### Build

```bash
# Build para produção
npm run build

# Build para desenvolvimento
npm run build:dev
```

Gera os arquivos otimizados para produção na pasta `dist/`.

### Preview

```bash
# Visualizar build de produção localmente
npm run preview
```

Permite visualizar a build de produção localmente antes do deploy.

### Linting e Formatação

```bash
# Executar linter
npm run lint

# Executar linter e corrigir problemas automaticamente
npm run lint:fix

# Formatar código com Oxfmt
npm run format
```

## 📁 Estrutura do Projeto

```
.
├── src/              # Código fonte da aplicação
├── public/           # Arquivos estáticos
├── dist/             # Build de produção (gerado)
├── node_modules/     # Dependências (gerado)
└── package.json      # Configurações e dependências do projeto
```

## 🎨 Componentes UI

Este template inclui uma biblioteca completa de componentes Shadcn UI baseados em Radix UI:

- Accordion
- Alert Dialog
- Avatar
- Button
- Checkbox
- Dialog
- Dropdown Menu
- Form
- Input
- Label
- Select
- Switch
- Tabs
- Toast
- Tooltip
- E muito mais...

## 📝 Ferramentas de Qualidade de Código

- **TypeScript**: Tipagem estática
- **Oxlint**: Linter extremamente rápido
- **Oxfmt**: Formatação automática de código

## 🔄 Workflow de Desenvolvimento

1. Instale as dependências: `npm install`
2. Inicie o servidor de desenvolvimento: `npm start`
3. Faça suas alterações
4. Verifique o código: `npm run lint`
5. Formate o código: `npm run format`
6. Crie a build: `npm run build`
7. Visualize a build: `npm run preview`

## 📦 Build e Deploy

Para criar uma build otimizada para produção:

```bash
npm run build
```

Os arquivos otimizados serão gerados na pasta `dist/` e estarão prontos para deploy.
