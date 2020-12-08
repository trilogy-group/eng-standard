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
