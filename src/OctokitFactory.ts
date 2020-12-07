import { container } from 'tsyringe';
import { Octokit } from "@octokit/rest";

export const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
    // use this for debugging
    // log: console
});

container.register<Octokit>(Octokit, { useValue: octokit });
