# Node.js Application Deployment with GitHub Actions

A learning project demonstrating how to containerize a Node.js application with Docker and deploy it to an AWS EC2 Ubuntu server using a GitHub Actions CI/CD workflow.

## Tech Stack

- **Node.js / Express** — application
- **Docker** — containerization
- **Docker Compose** — build and run the container
- **AWS EC2 (Ubuntu)** — VPS/server hosting
- **GitHub Actions** — CI/CD automation
- **SSH** — secure connection from GitHub Actions to EC2

## How the deployment works

1. Push changes to the `main` branch on GitHub.
2. GitHub Actions starts the workflow defined in `.github/workflows/deploy.yaml`.
3. The workflow connects to the EC2 instance over SSH using repository secrets.
4. The remote commands update the project and rebuild/restart the Docker container.
5. The application runs on the EC2 instance.

```text
Developer
   |
   | git push origin main
   v
GitHub Repository
   |
   v
GitHub Actions (.github/workflows/deploy.yaml)
   |
   | SSH using GitHub repository secrets
   v
AWS EC2 (Ubuntu)
   |
   | git pull + docker compose up -d --build
   v
Docker Container
   |
   v
Node.js / Express Application
```

## Repository structure

```text
nodejs-application-deploy-github-actions/
├── .github/
│   └── workflows/
│       └── deploy.yaml
├── Dockerfile
├── docker-compose.yml
├── package.json
├── package-lock.json
└── ...application files
```

The `.github` directory must be in the repository root. GitHub Actions discovers workflow YAML files placed in `.github/workflows/`.

## Run the application with Docker

From the project directory, build and start the application:

```bash
sudo docker compose up -d --build
```

Check running containers:

```bash
sudo docker ps
```

View logs:

```bash
sudo docker compose logs --tail=100
```

Test locally on the EC2 instance (this example assumes the app is published on port `9999`):

```bash
curl -v --max-time 5 http://localhost:9999/
```

To stop the Compose application:

```bash
sudo docker compose down
```

> The application port in the URL must match the port mapping in your Compose file. For external access, the EC2 security group must allow inbound traffic on the required port. Prefer limiting access to your own IP while testing; do not open unnecessary ports.

## Configure SSH access for GitHub Actions

GitHub Actions needs an SSH key pair so the workflow can securely connect to EC2.

### 1. Generate a dedicated SSH key locally

On your local computer, run:

```bash
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ~/.ssh/github-actions-deploy
```

If prompted for a passphrase, a key used by a non-interactive workflow generally needs to be configured without one, unless the workflow is set up to handle a passphrase.

This creates:

- `~/.ssh/github-actions-deploy` — **private key**
- `~/.ssh/github-actions-deploy.pub` — **public key**

Keep the private key secret. Never commit it to the repository or share it publicly.

### 2. Add the public key to EC2

Display the public key on your local computer:

```bash
cat ~/.ssh/github-actions-deploy.pub
```

Copy the complete line. Connect to EC2 using your existing working SSH method, then run:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
```

Add the new public key on its own line. **Keep existing keys** so you do not accidentally remove your current access. Save the file, then run:

```bash
chmod 600 ~/.ssh/authorized_keys
```

The file is named `authorized_keys` (not `authenticate_keys`).

### 3. Test the new key

From your local computer, run:

```bash
ssh -i ~/.ssh/github-actions-deploy ubuntu@YOUR_EC2_PUBLIC_IP
```

Replace `YOUR_EC2_PUBLIC_IP` with the current public IPv4 address of your EC2 instance. For an Ubuntu EC2 instance, the default SSH username is usually `ubuntu`.

If the connection fails with `Permission denied (publickey)`, verify that the matching public key is in `/home/ubuntu/.ssh/authorized_keys`, that the private-key path is correct, and that the EC2 security group permits SSH (TCP port 22) from your IP.

## Configure GitHub repository secrets

In the GitHub repository, go to **Settings → Secrets and variables → Actions → New repository secret**.

Create these secrets:

| Secret | Value |
|---|---|
| `SSH_HOST` | Your EC2 instance's public IPv4 address or configured hostname |
| `SSH_KEY` | The complete contents of the private key file `github-actions-deploy` |

To display the private key locally for copying into the secret:

```bash
cat ~/.ssh/github-actions-deploy
```

Copy the entire key, including the `BEGIN` and `END` lines, into the `SSH_KEY` secret field. Do not paste the `.pub` key into `SSH_KEY`.

**Never put the private key in `deploy.yaml`, commit it to Git, or share it in screenshots or chat.** GitHub masks secrets in logs, but secrets should still be handled carefully.

## GitHub Actions workflow

Create `.github/workflows/deploy.yaml`. A basic workflow for this project can look like:

```yaml
name: Deploy NodeJS Application And Make CI-CD

'on':
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Deploy Via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ubuntu
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /home/ubuntu/nodejs-application-deploy-github-actions
            git pull origin main
            sudo docker compose up -d --build
```

This workflow assumes:

- The repository is already cloned on EC2 at `/home/ubuntu/nodejs-application-deploy-github-actions`.
- The EC2 server can authenticate to GitHub when running `git pull origin main` (for a private repository, configure Git authentication separately).
- Docker and the Docker Compose plugin are installed on EC2.
- The Ubuntu user can run Docker with `sudo`.
- The SSH public key corresponding to `SSH_KEY` is installed in the `ubuntu` user's `~/.ssh/authorized_keys`.

For a more robust production setup, consider building an image in CI and publishing it to a container registry, then pulling a versioned image on EC2 instead of building directly on the server.

## Common issues encountered

### Docker permission denied

**Symptom:** Docker cannot connect to `/var/run/docker.sock`.

**Quick fix:**

```bash
sudo docker compose up -d
```

Alternatively, add the trusted user to the `docker` group and start a new login session. Membership in the Docker group grants powerful, effectively root-level access.

### Container runs, but the public URL times out

Check the port mapping:

```bash
sudo docker ps
```

Check application logs:

```bash
sudo docker compose logs --tail=100
```

Test the published port locally on EC2:

```bash
curl -v --max-time 5 http://localhost:9999/
```

If local access works but external access does not, verify the EC2 security group, network ACLs, public IP, and port mapping. Only open the necessary inbound port.

### SSH key not found locally

Check the key directory:

```bash
ls -la ~/.ssh/
```

Use the exact private-key path in the SSH command. The private key has no `.pub` suffix; the public key does.

### GitHub Actions workflow YAML error

Check indentation, spaces after list dashes, action input names, and multiline script formatting.

Correct examples:

```yaml
branches:
  - main
```

```yaml
script: |
  cd /home/ubuntu/nodejs-application-deploy-github-actions
  git pull origin main
  sudo docker compose up -d --build
```

Use `script`, not `scripts`, for the `appleboy/ssh-action` input.

### SSH authentication fails

Verify that:

- `SSH_HOST` contains the correct EC2 public IP/hostname.
- `SSH_KEY` contains the private key, not the `.pub` file.
- The corresponding public key is present in `~/.ssh/authorized_keys` for the SSH user.
- The workflow uses `username: ubuntu` for a standard Ubuntu EC2 instance.
- Inbound TCP port 22 is allowed from the appropriate source IP.

## Git commands

After editing the README, commit and push it:

```bash
git add README.md
git commit -m "docs: add CI/CD deployment notes"
git push origin main
```

## Security notes

- Never commit private SSH keys, passwords, or tokens.
- Restrict SSH access to trusted IP addresses where practical.
- Expose only the application ports that are needed.
- Review AWS costs for EC2 compute, storage, public IPv4 addresses, and other resources.
- Stop or delete resources when they are no longer needed, while checking which resources can continue to incur charges.

## Learning outcomes

By completing this project, I practiced:

- Building and running a Node.js application with Docker.
- Using Docker Compose on an Ubuntu EC2 server.
- Configuring SSH public-key authentication.
- Storing deployment credentials in GitHub repository secrets.
- Creating a GitHub Actions workflow triggered by pushes to `main`.
- Troubleshooting YAML, SSH, Docker permissions, and network-access issues.
