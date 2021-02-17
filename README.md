This GitHub Action enforces the Ship Every Merge standards on Trilogy products.

# Usage
* For a new project, [create it using the template](https://github.com/trilogy-group/eng-template/generate).
* For an existing project, copy [engineering-standards.yml](https://github.com/trilogy-group/eng-template/raw/main/.github/workflows/engineering-standards.yml) into your repository under .github/workflows/

# Pipeline
GitHub Actions require the built artefacts to appear in the repository.
The process is:
* Commit to main
* Continuous flow action triggers
* Project is built and packaged
* Release artefacts appear under the repo tag latest
* Projects refer to this repository as **trilogy-group/eng-standard@latest**

# Permissions

This action requires an admin token from Github in order to fix the found issues automatically. The image below illustrates these permissions - please apply them carefully to prevent hard-to-track permission issues:

<img width="774" alt="Github Action necessary permissions" src="https://user-images.githubusercontent.com/10912950/108193493-43fe4300-70f4-11eb-880c-611ca44cf4ce.png">
