# NUSISS DevSecOps Engineering: Topic and Technology Map

Source repository: `https://github.com/kenken64/NUSISS-DevSecOpsEng`

Branch reviewed: `master`  
Cloned revision: `f28f41a` (`Bump OWASP Dependency-Check to v13.0.0 in SAST workshop`)

This map consolidates the technologies, tools, practices, cloud services, and implementation patterns found in the repository. It is organised by the software-delivery lifecycle instead of by workshop or file order.

Evidence labels:

- **Implemented/configured** — appears in source code, configuration, Terraform, or a runnable example in the repository.
- **Workshop procedure** — taught through step-by-step instructions and commands, but may require another repository, account, or cloud environment.
- **Reference/mention** — appears as a quiz, submission artifact, optional exercise, or external reference rather than a complete implementation here.

## 1. Lifecycle map at a glance

| Delivery stage | Tools and technologies | Main topics covered |
|---|---|---|
| Planning and design | GitHub/GitLab, AWS CodeStar, AWS architecture scenarios | DevOps toolchain selection, CI/CD design, regional architecture, public/private applications, APIs, secure channels, IoT sensor OTA updates |
| Source control and collaboration | Git, GitHub, GitLab, SSH | Repositories, remotes, staging, commits, branches, tags, forks, pull requests, merge/rebase/cherry-pick/squash, conflict recovery |
| Application development | Node.js, Express, React, Python/Flask, Java/Spring Boot, Tomcat, MongoDB, MySQL, Redis, Nginx | Web applications, APIs, frontend builds, database-backed services, reverse proxies |
| Build | npm, Ant, Maven, Surefire, Docker, Docker Compose, Packer, AWS CodeBuild | Dependency installation, unit-test execution, packaging, Docker images, multi-stage builds, AMIs, build specifications |
| Test | Jest, Puppeteer, Chrome/ChromeHeadless, JUnit, JMeter | Unit testing, browser/E2E testing, test reports, tests in containers, performance-testing evidence |
| Code quality and security | JSHint, OWASP Dependency-Check, OWASP ZAP, Docker Scout, Snyk, npm audit | Linting, SAST, DAST, CVEs, dependency upgrades, image recommendations, policy compliance, SBOM/provenance, non-root containers |
| Package and release | Docker Hub, Amazon ECR, Amazon S3, GitHub Pages, GitHub Releases, GitHub Actions artifacts | Image tagging/publishing, artifact storage, frontend publication, changelogs, release automation |
| Infrastructure as code | Terraform/HCL, Terraform modules, AWS/DigitalOcean/Docker providers, Packer | Declarative provisioning, plan/apply/destroy, variables, outputs, modules, templates, state, cloud infrastructure automation |
| Configuration management | Ansible, Jinja2, Puppet, systemd, Nginx | Inventories, playbooks, templates, manifests, master/agent certificates, service reloads and configuration convergence |
| CI/CD orchestration | Jenkins, GitHub Actions, AWS CodePipeline, AWS CodeBuild, AWS CodeDeploy, AWS CodeStar, Travis CI | SCM triggers, polling/webhooks, build jobs, test gates, artifact passing, deployment hooks, blue/green delivery |
| Deployment and runtime | EC2, Elastic Beanstalk, ECS/Fargate, EKS, Kubernetes, Minikube, Docker Swarm, Nginx | VM/container deployment, orchestration, service discovery, scaling, rollouts, rollback, load balancing, self-healing |
| Operations and observability | Amazon CloudWatch, CloudWatch Logs, CloudWatch Container Insights, Auto Scaling, SNS, Route 53 | Logs, metrics, alarms, notifications, scaling, DNS, reliability and operational feedback |

## 2. Planning and solution design

### Topics

- Translate a business or operational problem into an end-to-end DevOps solution.
- Design a complete CI/CD pipeline and name the tools used at each stage.
- Separate public-facing and private applications and consider API boundaries.
- Design region-based deployments and secure cloud communication.
- Plan for near-real-time notifications, sensor data ingestion, and over-the-air firmware updates.
- Consider scalability, reliability, security patching, rollback, monitoring, and operational ownership.
- Use a proof-of-concept approach while making the pipeline and architecture explicit.

### Tools and evidence

- **GitHub/GitLab — Workshop procedure:** repository creation, collaboration, branching, and remote workflows.
- **AWS CodeStar — Workshop procedure:** create a project from Python Flask or Java Spring templates and observe its continuous-deployment pipeline.
- **End-to-end pipeline design — Workshop procedure:** `workshop/workshop7.md` and `workshop/workshop7 copy.md` contain the IoT/COVID-19 sensor scenario and the required architecture considerations.

## 3. Source control and collaboration

### Git and GitHub topics

- Initialise a repository and connect it to a remote with SSH or HTTPS.
- Stage, commit, push, pull, fetch, clone, restore, and inspect repository status/history.
- Use centralized, feature-branch, Gitflow, and forking workflows.
- Create and switch branches, including development and feature branches.
- Use tags and releases.
- Open and merge pull requests.
- Resolve conflicts and understand merge, rebase, cherry-pick, and squash workflows.
- Use descriptive, small, focused commits and keep the README current.
- Trigger automation with GitHub hooks or branch pushes.

### Tools

- Git CLI.
- GitHub and GitLab.
- SSH keys and Git remotes.
- GitHub web interface.
- Visual Studio Code Git integration.
- SourceTree and Git Tower are referenced as optional GUI clients.

Primary evidence: `git/README.md` and `workshop/workshop2.md`.

## 4. Application and platform technologies

### Node.js ecosystem — Implemented/configured

- Node.js and npm.
- Express web servers.
- `body-parser`, `request`, and `prompt`.
- Handlebars through `hbs` templates.
- MongoDB driver and MongoDB-backed quiz application examples.
- Jest and Jest-Puppeteer test configuration.
- Bootstrap in the sample frontend.

Evidence: `cdci/NodeJS/`, `container/NodeJS/`, and their `package.json` files.

### React frontend — Implemented/configured

- React and React DOM.
- Create React App tooling through `react-scripts`.
- Frontend production builds.
- `gh-pages` deployment support.
- React libraries for flags, fonts, typing effects, and speech recognition.

Evidence: `container/subsdevices/`.

### Python and Java — Workshop procedure

- Python 3 and Flask for a JSON web API using AWS CodeStar.
- Java/Spring Boot project templates using Jenkins and AWS CodeStar.
- Apache Ant and Apache Maven builds.
- Maven Surefire reports and JUnit XML output.
- Tomcat deployment of a Spring Boot WAR through a Docker image.

Evidence: `workshop/workshop7 copy.md` and `workshop/workshop3.md`.

### Supporting services and web infrastructure

- MySQL in a Docker three-tier example.
- Redis in a Node.js container/Compose example.
- Nginx as a reverse proxy and load balancer using upstream servers and `least_conn`.
- Bash/shell scripting, Python automation, JSON, YAML, HCL, Jinja2 templates, and `jq` for pipeline and infrastructure automation.

## 5. Build and packaging

### Local and CI build tools

- **npm:** install dependencies, run tests, build frontends, lint, audit dependencies, and publish frontend output.
- **Jenkins:** run Ant and Maven jobs, execute pre-build steps, publish test reports, and fail/mark builds unstable when tests fail.
- **AWS CodeBuild:** run a `buildspec.yml`, build Docker images, log into ECR, tag images, and push versioned/latest tags.
- **GitHub Actions:** install Node.js, cache `node_modules`, run `npm ci`, build, lint, and optionally test.
- **Packer:** build an AWS AMI and pass the AMI identifier into a Terraform deployment.

### Docker build topics

- Write Dockerfiles with `FROM`, `WORKDIR`, `COPY`, `RUN`, `EXPOSE`, `CMD`, and `USER`.
- Build small images from Alpine or official Node images.
- Use build context, tags, ports, volumes, and bind mounts.
- Use multi-stage builds to compile a React app and serve static assets from Nginx.
- Use Docker Compose to run application and test services together.
- Build, tag, push, and version images in Docker Hub or Amazon ECR.
- Produce image provenance and SBOM metadata using Docker build flags.

Evidence: `container/README.md`, `container/*/Dockerfile*`, `container/*/docker-compose.yml`, and `terraform/src/codepipeline-demo/app/config/buildspec.yml`.

## 6. Testing and verification

### Automated testing

- **Jest — Implemented/configured:** Node.js unit tests and test suites using `jest.config.js`.
- **Puppeteer/Jest-Puppeteer — Implemented/configured:** browser-driven testing, Chrome testing, screenshots, and E2E test setup.
- **JUnit — Workshop procedure/reference:** Jenkins publishes JUnit reports from Ant and Maven builds; JUnit submission artifacts are included.
- **Maven Surefire — Workshop procedure:** generate XML test reports for Jenkins.
- **JMeter — Reference/submission:** a performance-testing submission folder is present, but the repository only contains submission instructions and screenshots.
- **Dockerized tests — Workshop procedure:** run `npm run test` in a test container through Docker Compose.
- **GitHub Actions tests — Workshop procedure:** execute frontend tests on a Node.js matrix runner and use Chrome/ChromeHeadless where configured.

### Verification practices

- Test locally before enabling post-build report publication.
- Intentionally introduce a failing test to observe Jenkins failure/unstable status.
- Archive test and security reports as CI artifacts.
- Verify deployment through an application endpoint after the pipeline completes.

## 7. Code quality and DevSecOps security

### Static quality and security

- **JSHint — Workshop procedure:** lint JavaScript and produce a machine-readable report.
- **OWASP Dependency-Check — Workshop procedure:** scan project dependencies, use NVD data, and archive an HTML SAST report.
- **npm audit — Workshop procedure:** identify and remediate vulnerable npm dependencies.
- **Docker Scout — Workshop procedure:** scan image CVEs, filter by package, view recommendations, and check policy compliance.
- **Snyk / legacy `docker scan` — Optional workshop/reference:** scan container images for vulnerabilities.

### Dynamic security testing

- **OWASP ZAP — Workshop procedure:** run a baseline DAST scan from the `zaproxy/zap-stable` image and archive the HTML report.

### Container and pipeline security practices

- Use secrets through GitHub Actions secrets or CI credential stores rather than committing tokens.
- Use IAM roles and policies for AWS services and Jenkins/CodeDeploy integration.
- Apply security groups and SSH key pairs to cloud instances.
- Run containers as a non-root user where possible.
- Enable Docker containerd snapshotter support where required for image metadata.
- Generate image provenance and SBOM data.
- Understand Docker secrets, content trust, image signing, Docker RBAC, and registry scanning.

Primary evidence: `workshop/workshop9.md`, `workshop/workshop-docker-scout.md`, `workshop/workshop5.md`, and `quizes/README.md`.

## 8. CI/CD orchestration and release automation

### Jenkins — Workshop procedure

- Install Jenkins on an AWS EC2/Bitnami instance.
- Configure Git SCM, GitHub project links, branch selection, polling, and GitHub hook triggers.
- Create freestyle, Ant, and Maven project jobs.
- Install and use Jenkins plugins, including Git and CodeDeploy-related integration.
- Configure tools such as JDK, Ant, Maven, Docker, AWS CLI, Terraform, and Packer.
- Publish JUnit/Surefire reports and observe successful, failed, and unstable builds.
- Understand executors, build nodes, distributed builds, `JENKINS_HOME`, environment variables, email notifications, logs, plugins, and clean shutdown.
- Push built Docker images to Docker Hub using Jenkins credentials.

Evidence: `workshop/workshop1.md`, `workshop/workshop3.md`, `workshop/workshop7 copy.md`, `jenkins_installation/README.md`, and `terraform/src/jenkins-packer-demo/`.

### GitHub Actions — Workshop procedure

- Define workflow YAML under `.github/workflows/`.
- Trigger on pushes to a development branch.
- Use hosted Ubuntu runners and Node.js version matrices.
- Use `actions/checkout`, `actions/setup-node`, browser setup, dependency caching, artifact upload, release creation, and conventional changelog actions.
- Store repository tokens in GitHub secrets.
- Build, lint, test, create a release, and deploy a frontend to GitHub Pages.
- Add separate lint, SAST, and DAST workflows.

Evidence: `workshop/workshop6.md` and `workshop/workshop9.md`.

### AWS-native pipelines — Implemented/configured and workshop procedure

- **AWS CodeStar:** create a project from Flask or Spring templates and observe continuous deployment.
- **AWS CodeCommit:** source stage in a Terraform-defined pipeline.
- **AWS CodeBuild:** Docker build stage using `buildspec.yml`.
- **AWS CodePipeline:** source → build → deploy stages.
- **AWS CodeDeploy:** deployment groups, AppSpec hooks, ECS deployment, traffic control, blue/green deployment, rollback on failure.
- **AWS ECR:** private Docker image registry.
- **Amazon S3:** pipeline artifact store and build cache.
- **AWS KMS:** encryption key for pipeline artifacts.

Evidence: `terraform/src/codepipeline-demo/`, `terraform/README.md`, `cdci/NodeJS/`, and `workshop/workshop7 copy.md`.

### Other CI/CD integration

- **Travis CI — Implemented/configured:** `.travis.yml` builds a Docker image, runs tests in a container, and deploys to AWS Elastic Beanstalk.
- **AWS CodeDeploy AppSpec — Implemented/configured:** lifecycle hooks for install, stop, start, and service validation are in `cdci/NodeJS/appspec.yml` and `container/NodeJS/appspec.yml`.

## 9. Infrastructure as code and provisioning

### Terraform — Implemented/configured

- HCL configuration for declarative infrastructure.
- `terraform init`, `plan`, `apply`, `destroy`, and saved plan files.
- Variables, outputs, provider configuration, resource dependencies, `count`, `for_each`, modules, data sources, and template files.
- AWS provider for EC2, VPC, networking, RDS, IAM, S3, ECS, EKS, Auto Scaling, load balancers, Code* services, and supporting resources.
- Docker provider for networks, volumes, images, and containers.
- DigitalOcean provider for droplets and SSH keys.
- Local provider for generated inventory, Nginx configuration, and marker files.
- HTTP provider in the EKS example.
- S3-backed state/artifact patterns and Terraform module reuse.

Evidence: `terraform/README.md` and `terraform/src/`.

### Packer — Implemented/configured

- Build an AWS AMI from a JSON template.
- Capture the generated AMI ID.
- Store generated Terraform input in S3.
- Use Jenkins to chain Packer output into Terraform provisioning.

Evidence: `terraform/src/packer-demo/` and `terraform/src/jenkins-packer-demo/`.

### AWS command-line and SDK automation

- **AWS CLI:** configure profiles/regions, create EC2 security groups and key pairs, manage S3 buckets, and automate cleanup.
- **Python/boto3:** manage EC2, S3, SNS, IAM, and CloudWatch; use `argparse` for command-line parameters.
- **Bash:** automate cleanup, installation, deployment hooks, task-definition updates, and network configuration.

Evidence: `awscli/`, `boto3/`, and the shell scripts under `terraform/src/` and `cdci/NodeJS/`.

## 10. Configuration management

### Ansible — Workshop procedure

- Create an inventory in YAML.
- Write playbooks and use Jinja2 templates.
- Configure Nginx and code-server on Ubuntu.
- Update systemd service files and reload the systemd daemon.
- Restart services using Ansible modules.
- Use Terraform to provision a DigitalOcean server and generate the Ansible inventory.

Evidence: `workshop/workshop-ansible.md`.

### Puppet — Workshop procedure

- Use a Puppet master and multiple agents on EC2.
- Configure hostnames, `/etc/hosts`, and the Puppet server/agent relationship.
- Exchange and sign certificates.
- Use `puppet.conf`, manifests, modules, and files served through the Puppet module path.
- Run one-time or daemonized agent updates and control the run interval.
- Troubleshoot certificates and agent/master communication.

Evidence: `workshop/workshop4.md` and `puppet/README.md`.

## 11. Containers and orchestration

### Docker Engine and Compose

- Install Docker Engine, CLI, and containerd.
- Manage images, containers, logs, lifecycle, pruning, networks, ports, volumes, and environment variables.
- Run Docker without `sudo` through group permissions.
- Build custom images and optimise Dockerfile layer caching.
- Use Docker Compose for multi-service application and test environments.
- Publish images to Docker Hub and Amazon ECR.

### Docker Swarm

- Create manager and worker nodes with Docker Machine and VirtualBox.
- Initialise a swarm and join workers.
- Deploy services, replicas, global/replicated workloads, overlay networks, and Nginx.
- Scale services, drain nodes, update images, inspect nodes, and roll back/remove services.
- Understand secrets, content trust, registry scanning, UCP/DTR, and Docker RBAC.

Evidence: `swarm/README.md`, `quizes/README.md`, and `container/README.md`.

### Kubernetes and Amazon EKS

- Use Minikube for local Kubernetes.
- Create deployments and services with `kubectl`.
- Inspect pods and deployments, scale replicas, observe self-healing, update images, monitor rollout status, and undo a rollout.
- Provision EKS with Terraform or `eksctl`.
- Configure `kubectl`, AWS IAM authentication, node groups, cluster logging, and CloudWatch Container Insights.
- Use Helm as a Kubernetes package manager.

Evidence: `workshop/k8.md`, `workshop/workshop8.md`, and `terraform/src/eks-demo/`.

## 12. Deployment targets and runtime architecture

| Target/platform | What the repository demonstrates |
|---|---|
| AWS EC2 | Jenkins servers, application servers, Puppet master/agents, Packer-built instances, and general Terraform demos |
| AWS Elastic Beanstalk | Dockerized React deployment through Travis CI and an optional GitHub Actions path |
| AWS ECS with Fargate | Container service, task definitions, load balancer, CloudWatch logs, and CodeDeploy blue/green deployment |
| Amazon EKS | Hosted Kubernetes cluster, worker nodes, IAM authentication, logging, metrics, and Terraform setup |
| Docker Swarm | Manager/worker cluster, services, replicas, scaling, updates, and node draining |
| Minikube | Local Kubernetes deployments, self-healing, scaling, rollout, and rollback |
| DigitalOcean | Ubuntu droplets, Docker Machine, Terraform provisioning, Nginx reverse proxy, and Ansible configuration |
| Nginx | Reverse proxy, upstream load balancing, static frontend serving, and service configuration |

## 13. AWS service inventory

These services appear in Terraform examples, CLI/SDK examples, pipeline definitions, or workshops. Some are teaching examples rather than a single production architecture.

### Compute and application hosting

- EC2 instances and AMIs.
- EBS volumes and volume attachments.
- Elastic Beanstalk applications and environments.
- Auto Scaling groups, launch configurations, policies, and notifications.

### Networking and traffic management

- VPCs, subnets, route tables, route associations, Internet Gateways, NAT Gateways, and Elastic IPs.
- Security groups and security-group rules.
- Classic Elastic Load Balancer and Application Load Balancer resources, listeners, and target groups.
- Route 53 hosted zones and records.

### Containers and registries

- Amazon ECR repositories.
- Amazon ECS clusters, services, and task definitions.
- AWS Fargate launch type.
- Amazon EKS clusters and worker infrastructure.

### Data, storage, and configuration

- Amazon S3 buckets for artifacts, state, cache, and generated files.
- Amazon RDS database instances, parameter groups, and subnet groups.
- AWS Systems Manager Parameter Store.
- EBS-backed storage.

### DevOps services

- AWS CodeStar.
- AWS CodeCommit.
- AWS CodeBuild.
- AWS CodePipeline.
- AWS CodeDeploy.

### Identity, encryption, and security

- IAM users, groups, roles, policies, policy attachments, and instance profiles.
- KMS keys and aliases for artifact encryption.
- EC2 key pairs and SSH access.
- AWS IAM authentication for EKS.

### Observability and notifications

- CloudWatch log groups.
- CloudWatch metric alarms.
- CloudWatch Container Insights for EKS.
- SNS topics and Auto Scaling notifications.

## 14. Core DevSecOps practices to be able to explain

- Continuous integration: every branch change should build and test automatically.
- Continuous delivery/deployment: validated artifacts move through repeatable deployment stages.
- SCM triggers: polling versus GitHub hooks and branch-based workflows.
- Build reproducibility: dependency lockfiles, build specifications, versioned image tags, and artifact archives.
- Test automation: unit, browser/E2E, integration/container, and performance testing.
- Quality gates: linting, test reports, and build status.
- SAST, DAST, dependency scanning, container CVE scanning, and remediation.
- Secure secret handling, IAM roles, least privilege, and security-group control.
- Container hardening: non-root users, minimal images, dependency upgrades, provenance, and SBOMs.
- Infrastructure as code: declarative state, plans, reviews, repeatable provisioning, and controlled destruction.
- Configuration management: converge servers to a desired state through Ansible or Puppet.
- Container orchestration: replicas, self-healing, rolling updates, rollback, service discovery, and load balancing.
- Reliability and operations: logs, metrics, alarms, autoscaling, regional placement, and incident feedback.
- Deployment strategies: lifecycle hooks, traffic control, blue/green deployment, rollback, and post-deployment validation.

## 15. Repository evidence index

| Repository path | Main evidence |
|---|---|
| `README.md` | Course workshop index and headline technology list |
| `git/README.md`, `workshop/workshop2.md` | Git workflows and GitHub practice |
| `workshop/workshop1.md`, `workshop/workshop3.md` | Jenkins installation, Ant/Maven CI, SCM triggers, JUnit reports |
| `workshop/workshop6.md`, `workshop/workshop9.md` | GitHub Actions, build/lint/test/release/deploy, SAST/DAST |
| `workshop/workshop7 copy.md` | AWS CodeStar, Python Flask, Spring Boot, Jenkins, Docker Hub |
| `cdci/NodeJS/` | Node.js app, Jest/Puppeteer, AWS CodeDeploy AppSpec/hooks |
| `container/` | Dockerfiles, Compose, Node/React/Redis examples, image publishing, container security |
| `swarm/README.md`, `workshop/k8.md` | Docker Swarm and local Kubernetes operations |
| `workshop/workshop8.md`, `terraform/src/eks-demo/` | EKS, eksctl, kubectl, Helm, IAM auth, CloudWatch logging/metrics |
| `terraform/README.md`, `terraform/src/` | Terraform/HCL, AWS services, modules, ECS/Fargate pipeline, Packer integration |
| `workshop/workshop3-1.md` | Terraform + DigitalOcean + Docker + Nginx reverse proxy |
| `workshop/workshop-ansible.md` | Ansible inventory, playbooks, templates, systemd, Terraform integration |
| `workshop/workshop4.md`, `puppet/README.md` | Puppet master/agent, certificates, manifests, modules, run intervals |
| `awscli/`, `boto3/` | AWS CLI and Python SDK automation |
| `workshop/workshop-docker-scout.md`, `quizes/README.md` | Image vulnerabilities, recommendations, compliance, secrets, RBAC, content trust |

## 16. Interpretation and safety notes

- The repository is primarily teaching material: several examples are old, version-pinned, incomplete, or dependent on external repositories/accounts.
- Some technologies appear as workshop instructions or screenshots rather than fully runnable projects in this clone; those are marked above.
- The clone contains historical credential-like placeholders, account-specific examples, public endpoints, and cloud resource names in teaching material. Do not reuse them; use environment variables, secret stores, least-privilege IAM, and fresh credentials.
- `tmp/NUSISS-DevSecOpsEng` is a temporary reference clone and is excluded from the parent project repository through `.gitignore`.
