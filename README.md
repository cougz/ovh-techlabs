# OVHcloud TechLabs

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/release/python-311/)
[![Node.js 18+](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-required-blue.svg)](https://www.docker.com/)
[![Project Status: Main](https://img.shields.io/badge/Project%20Status-Main%20Project-green.svg)](https://github.com/ovhcloud/ovh-techlabs)

A comprehensive ecosystem for running technical workshops on OVHcloud infrastructure, combining automated environment provisioning with hands-on tutorial content.

## 📊 Project Status

**Main Project** - This project is under active maintenance and is a core component of OVHcloud's technical enablement strategy.

## 🎯 Overview

OVHcloud TechLabs provides everything needed to run successful technical workshops:

- **Automated Infrastructure**: Deploy isolated cloud environments for each workshop attendee
- **Workshop Content**: Step-by-step tutorials and workbooks for various OVHcloud services
- **Self-Service Platform**: Web dashboard for workshop management and monitoring
- **Scalable Architecture**: Support for workshops with up to 50 attendees

## 📁 Repository Structure

```
ovh-techlabs/
├── platform/           # Workshop automation platform
│   ├── api/           # FastAPI backend
│   ├── frontend/      # React dashboard
│   ├── database/      # PostgreSQL schemas
│   └── docker/        # Deployment configs
└── workbooks/         # Workshop tutorials
    ├── docs/          # MkDocs content
    └── public-cloud/  # Tutorial source code
```

## 🚀 Quick Start

### Running the Platform

The automation platform manages workshop deployments:

```bash
cd platform
docker-compose up -d
```

Access the dashboard at `http://localhost:3000`

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

- **Backend**: FastAPI, Celery, PostgreSQL, Redis
- **Frontend**: React, TypeScript, Redux Toolkit, Tailwind CSS
- **Infrastructure**: Terraform, Docker, OVHcloud Public Cloud
- **Documentation**: Material for MkDocs, GitHub Pages

## 📖 Documentation

- [Platform Documentation](platform/README.md) - Detailed platform setup and usage
- [Workbooks Documentation](workbooks/README.md) - Tutorial authoring guide
- [API Reference](platform/api/README.md) - REST API documentation

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

OVHcloud is a global cloud provider that delivers industry-leading performance and cost-effective solutions to better manage, secure, and scale data.

---

For support and questions, please open an issue or contact the TechLabs team.