/**
 * This configuration file lets you run `$ sanity [command]` in this folder
 * Go to https://www.sanity.io/docs/cli to learn more.
 **/
import { defineCliConfig } from "sanity/cli";

const projectId = "0nqn5jl0";
const dataset = "production";

export default defineCliConfig({ api: { projectId, dataset } });
