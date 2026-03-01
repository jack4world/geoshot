#!/usr/bin/env node

import { Command } from "commander";
import { addCommonOptions, addImageOptions, addVideoOptions } from "../src/cli/options.js";
import { runInfo } from "../src/cli/commands/info.js";
import { runImage } from "../src/cli/commands/image.js";
import { runVideo } from "../src/cli/commands/video.js";

const program = new Command();

program
  .name("geoshot")
  .description("GPX/KML → image/video CLI tool")
  .version("0.1.0");

// info command
const infoCmd = new Command("info")
  .description("Show track statistics and metadata");
addCommonOptions(infoCmd);
infoCmd.action(async (opts) => {
  await runInfo(opts);
});
program.addCommand(infoCmd);

// image command
const imageCmd = new Command("image")
  .description("Render a track to an image");
addCommonOptions(imageCmd);
addImageOptions(imageCmd);
imageCmd.action(async (opts) => {
  await runImage(opts);
});
program.addCommand(imageCmd);

// video command
const videoCmd = new Command("video")
  .description("Render a track flythrough video");
addCommonOptions(videoCmd);
addVideoOptions(videoCmd);
videoCmd.action(async (opts) => {
  await runVideo(opts);
});
program.addCommand(videoCmd);

program.parse();
