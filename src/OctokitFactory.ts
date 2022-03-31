import { container } from 'tsyringe';
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
    // use this for debugging
    // log: console
});
container.register<Octokit>(Octokit, { useValue: octokit });

if (process.env.REPO_GITHUB_TOKEN == null) {
    container.register<Octokit>('OctokitAdmin', { useValue: octokit });
} else {
    const octokitAdmin = new Octokit({
        auth: process.env.REPO_GITHUB_TOKEN,
        // use this for debugging
        // log: console
    });
    container.register<Octokit>('OctokitAdmin', { useValue: octokitAdmin });
}
