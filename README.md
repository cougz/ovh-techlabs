# OVHcloud TechLabs - Source Code

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/release/python-311/)
[![Node.js 18+](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-required-blue.svg)](https://www.docker.com/)
[![Project Status: Main](https://img.shields.io/badge/Project%20Status-Main%20Project-green.svg)](https://github.com/ovhcloud/ovh-techlabs)

🚀 **Official source code repository for the OVHcloud TechLabs event** - An invitation-only technical workshop series showcasing OVHcloud's cloud capabilities through hands-on labs and automated infrastructure.

## 📊 Project Status

**Production Ready** - This repository contains the production code used to run official OVHcloud TechLabs events worldwide. The platform is fully operational with:

- ✅ Complete feature implementation (workshop lifecycle, attendee management, resource deployment)
- ✅ OVH API integration tested and verified with real deployments
- ✅ CSV bulk import with OVH IAM-compliant username validation
- ✅ Timezone-aware scheduling with automatic cleanup
- ✅ Reliable workshop cleanup system with catch-up mechanisms
- ✅ Dark mode UI with OVHcloud branding
- ✅ 100% test coverage for implemented features
- ✅ Docker deployment with health monitoring
- ✅ Data-safe rebuild process for seamless updates

This is actively maintained as part of OVHcloud's technical enablement and partner education initiatives.

## 🎯 About OVHcloud TechLabs

OVHcloud TechLabs is our technical workshop event designed to provide hands-on experience with OVHcloud services. This repository contains the complete platform used to deliver these events:

- **Automated Infrastructure**: Deploy isolated cloud environments for each workshop attendee
- **Workshop Content**: Step-by-step tutorials and workbooks for various OVHcloud services
- **Self-Service Platform**: Web dashboard for workshop management and monitoring
- **Scalable Architecture**: Support for workshops with multiple attendees

## 📁 Repository Structure

```
ovh-techlabs/
├── platform/          # Workshop automation platform
│   ├── api/          # FastAPI backend
│   ├── frontend/     # React dashboard
│   ├── database/     # PostgreSQL schemas
│   ├── docker-compose.yml # Production deployment
│   └── docker-compose.dev.yml # Development setup
└── workbooks/        # Workshop tutorials
    ├── docs/         # MkDocs content
    └── public-cloud/ # Tutorial source code
```

## 🚀 Quick Start

### Running the Platform

The automation platform manages workshop deployments:

```bash
cd platform

# 1. Configure environment variables
cp .env.example .env
# Edit .env with your OVHcloud credentials and configuration

# 2. Start the platform
docker compose up -d
```

Access the dashboard at `http://localhost:3000`

### Rebuilding the Platform

For safe platform updates without data loss:

```bash
# Safe rebuild (preserves all data - recommended)
./rebuild.sh

# Complete reset (removes all data - use with caution)
./rebuild.sh --reset-data
```

The default rebuild preserves all workshop data, attendee information, and database state for seamless updates.

#### Environment Configuration

The platform requires proper environment configuration before deployment. Key settings include:

- **OVHcloud API credentials** (get from [api.ovh.com/createToken](https://api.ovh.com/createToken/))
- **Database and Redis connection settings**
- **Security keys and JWT configuration**
- **Terraform and deployment settings**

Copy `.env.example` to `.env` and update the values for your environment:

```bash
cd platform
cp .env.example .env
# Edit .env file with your actual credentials
```

**Important**: Never commit your actual `.env` file to version control. It contains sensitive credentials.

### Viewing Workbooks

The workbooks provide tutorial content:

```bash
cd workbooks
pip install mkdocs-material
mkdocs serve
```

View documentation at `http://localhost:8000`

## 📚 Components

### Platform (Workshop Automation)

The platform automates the entire workshop lifecycle:

- **Workshop Creation**: Define workshops with custom parameters
- **Attendee Management**: Generate unique environments for each participant
- **Resource Deployment**: Terraform-based infrastructure provisioning
- **Automated Cleanup**: Scheduled resource cleanup after workshop completion
- **Real-time Monitoring**: WebSocket-based deployment status updates

[Learn more →](platform/README.md)

### Workbooks (Tutorial Content)

Step-by-step guides for workshop attendees:

- **AI Endpoints**: RAG systems, Vision Language Models
- **Public Cloud**: Infrastructure deployment tutorials
- **Hands-on Labs**: Practical exercises with real OVHcloud services

[Browse tutorials →](workbooks/README.md)

## 🛠️ Technology Stack

- **Backend**: FastAPI (Python 3.11+), Celery, PostgreSQL 15, Redis
- **Frontend**: React 18, TypeScript, Redux Toolkit, Tailwind CSS
- **Infrastructure**: Terraform, Docker Compose v2, OVHcloud Public Cloud
- **Tutorials & Guides**: Material for MkDocs, GitHub Pages (for step-by-step guides and tutorials)
- **Development**: Test-Driven Development (TDD), 100% test coverage

## 📖 Documentation

- [Platform Documentation](platform/README.md) - Detailed platform setup and usage
- [Workbooks Documentation](workbooks/README.md) - Tutorial authoring guide
- [API Reference](platform/api/README.md) - REST API documentation

## 🔧 Operations & Troubleshooting

### Workshop Cleanup Management

The platform includes robust automatic cleanup mechanisms:

- **Automatic Scheduling**: Workshops are automatically scheduled for cleanup 1 hour after completion
- **Reliable Execution**: Unified lifecycle task runs every 30 minutes to process scheduled cleanups
- **Startup Recovery**: Missed cleanups are automatically processed when the platform restarts
- **Manual Trigger**: Use `POST /api/workshops/process-lifecycle` to manually trigger cleanup checks

### Platform Management

```bash
# Check container health
docker compose ps

# View platform logs
docker logs ovh-techlabs-api

# Check Celery worker status
docker logs ovh-techlabs-celery-worker

# Manual cleanup trigger (if needed)
curl -X POST http://localhost:8000/api/workshops/process-lifecycle \
  -H "Authorization: Bearer <your-token>"
```

### Data Safety

- All rebuild operations preserve data by default
- Database migrations are handled automatically
- Workshop and attendee data persists across platform updates
- Use `./rebuild.sh --reset-data` only when starting fresh

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) file for detailed guidelines on:

- Adding new workshop templates
- Creating tutorial content
- Improving the platform
- Reporting issues

All contributors must follow the guidelines in CONTRIBUTING.md.

## 👥 Maintainers

See [MAINTAINERS](MAINTAINERS) for the list of project maintainers.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏢 About OVHcloud

OVHcloud is a global cloud provider that delivers industry-leading performance and cost-effective solutions to better manage, secure, and scale data. We are committed to data sovereignty and open-source software (FOSS), ensuring our customers maintain control over their data while benefiting from transparent, community-driven technologies.

## 🎪 TechLabs Events

OVHcloud TechLabs events are invitation-only technical workshops hosted at OVHcloud facilities and partner locations worldwide. Each event features:

- Expert-led sessions on cloud technologies
- Hands-on labs with real OVHcloud infrastructure
- Individual cloud environments for each attendee
- Networking opportunities with OVHcloud engineers

This source code powers the automation and content delivery for these exclusive events.

---

For support and questions about the TechLabs platform code, please open an issue. For event inquiries, contact your OVHcloud representative.
