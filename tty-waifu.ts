#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-run --allow-env

/**
 * TTY Waifu - Terminal waifu slideshow
 *
 * A Deno terminal-based waifu slideshow that fetches images from the Waifu API
 * and displays them using jp2a.
 *
 * Requirements:
 * - Deno runtime (v1.30+)
 * - jp2a for ASCII art conversion
 *
 * @example
 * ```bash
 * deno run --allow-net --allow-read --allow-write --allow-run tty-waifu.ts --colors
 *
 * # Or simply:
 * chmod +x tty-waifu.ts
 * ./tty-waifu.ts --nsfw --interval=5 --dir=./waifus --colors --fill
 * ```
 *
 * @author Eddy Ntambwe <eddydarell@gmail.com>
 * @license GNU general public license v2.0
 * @version 0.0.1
 */

import {
  bgBrightCyan,
  bgBrightGreen,
  bgBrightMagenta,
  bgBrightRed,
  bgBrightWhite,
  bgBrightYellow,
  bgRed,
  bold,
  brightCyan,
  brightRed,
  green,
  red,
  white,
  yellow,
} from "https://deno.land/std@0.181.0/fmt/colors.ts";

// Type definitions
interface WaifuApiResponse {
  images: Array<{
    signature: string;
    extension: string;
    image_id: number;
    favorites: number;
    dominant_color: string;
    source: string;
    artist: {
      artist_id: number;
      name: string;
      patreon: string | null;
      pixiv: string | null;
      twitter: string | null;
      deviant_art: string | null;
    } | null;
    uploaded_at: string;
    liked_at: string | null;
    is_nsfw: boolean;
    width: number;
    height: number;
    byte_size: number;
    url: string;
    preview_url: string;
    tags: Array<{
      tag_id: number;
      name: string;
      description: string;
      is_nsfw: boolean;
    }>;
  }>;
}

interface Config {
  includeNsfw: boolean;
  intervalSeconds: number;
  outputDir: string;
  colors: boolean;
  fill: boolean;
  caption: boolean;
  maxRetries: number;
  timeout: number;
  noSave?: boolean;
  customTags?: string[];
}

interface Tags {
  versatile: string[];
  nsfw: string[];
}

// Logging utility
class Logger {
  private static formatTime(): string {
    return new Date().toISOString().replace("T", " ").slice(0, 19);
  }

  private static isDebugMode(): boolean {
    return Deno.env.get("DEBUG") === "true";
  }

  static info(message: string): void {
    if (this.isDebugMode()) {
      const timestamp = brightCyan(`[${this.formatTime()}]`);
      const level = bgBrightCyan(bold(` INFO `));
      console.log(`${timestamp} ${level} ${white(message)}`);
    }
  }

  static error(message: string, error?: Error): void {
    if (this.isDebugMode()) {
      const timestamp = brightCyan(`[${this.formatTime()}]`);
      const level = bgBrightRed(bold(` ERROR `));
      console.error(`${timestamp} ${level} ${brightRed(message)}`);
      if (error) {
        const stackLabel = bgRed(bold(` STACK `));
        console.error(
          `${timestamp} ${stackLabel} ${red(error.stack || error.message)}`,
        );
      }
    }
  }

  static warn(message: string): void {
    if (this.isDebugMode()) {
      const timestamp = brightCyan(`[${this.formatTime()}]`);
      const level = bgBrightYellow(bold(` WARN `));
      console.warn(`${timestamp} ${level} ${yellow(message)}`);
    }
  }

  static debug(message: string): void {
    if (this.isDebugMode()) {
      const timestamp = brightCyan(`[${this.formatTime()}]`);
      const level = bgBrightMagenta(bold(` DEBUG `));
      console.log(`${timestamp} ${level} ${white(message)}`);
    }
  }

  static success(message: string): void {
    if (this.isDebugMode()) {
      const timestamp = brightCyan(`[${this.formatTime()}]`);
      const level = bgBrightGreen(bold(` SUCCESS `));
      console.log(`${timestamp} ${level} ${green(message)}`);
    }
  }
}

// System dependency checker
class DependencyChecker {
  static async checkJp2a(): Promise<boolean> {
    try {
      const jp2aCheck = new Deno.Command("which", {
        args: ["jp2a"],
        stdout: "piped",
        stderr: "piped",
      });
      const output = await jp2aCheck.output();
      return output.code === 0;
    } catch (error) {
      Logger.error("Failed to check jp2a dependency", error as Error);
      return false;
    }
  }

  static async checkAllDependencies(): Promise<void> {
    Logger.info("Checking system dependencies...");

    const jp2aExists = await this.checkJp2a();
    if (!jp2aExists) {
      Logger.error("jp2a is not installed or not in PATH");
      console.error("\nTo install jp2a:");
      console.error("  macOS: brew install jp2a");
      console.error("  Ubuntu/Debian: sudo apt-get install jp2a");
      console.error("  Arch: sudo pacman -S jp2a");
      Deno.exit(1);
    }

    Logger.success("All dependencies satisfied");
  }
}

// Configuration management
class ConfigManager {
  private static readonly DEFAULT_CONFIG: Config = {
    includeNsfw: false,
    intervalSeconds: 10,
    outputDir: "./waifus",
    colors: false,
    fill: false,
    caption: false,
    maxRetries: 3,
    timeout: 30000,
  };

  static parseArgs(): Config {
    const config = { ...this.DEFAULT_CONFIG };

    config.noSave = Deno.args.includes("--no-save");
    config.includeNsfw = Deno.args.includes("--nsfw");
    config.colors = Deno.args.includes("--colors");
    config.fill = Deno.args.includes("--fill");
    config.caption = Deno.args.includes("--caption");

    const intervalArg = Deno.args.find((arg) => arg.startsWith("--interval="));
    if (intervalArg) {
      const interval = parseInt(intervalArg.split("=")[1]);
      if (!isNaN(interval) && interval > 0) {
        config.intervalSeconds = interval;
      }
    }

    const dirArg = Deno.args.find((arg) => arg.startsWith("--dir="));
    if (dirArg) {
      config.outputDir = dirArg.split("=")[1];
    }

    const tagsArg = Deno.args.find((arg) => arg.startsWith("--tags="));
    if (tagsArg) {
      const tags = tagsArg.split("=")[1].split(",").map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
      if (tags.length > 0) {
        config.customTags = tags;
        // If NSFW tags are specified, enable NSFW mode
        const nsfwTags = [
          "ass",
          "hentai",
          "milf",
          "oral",
          "paizuri",
          "ecchi",
          "ero",
        ];
        if (tags.some((tag) => nsfwTags.includes(tag.toLowerCase()))) {
          config.includeNsfw = true;
        }
      }
    }

    return config;
  }
}

// Image fetcher with retry logic
class WaifuFetcher {
  private static readonly API_URL = "https://api.waifu.im/search";

  private static readonly TAGS: Tags = {
    "versatile": [
      "maid",
      "waifu",
      "marin-kitagawa",
      "mori-calliope",
      "raiden-shogun",
      "oppai",
      "selfies",
      "uniform",
      "kamisato-ayaka",
    ],
    "nsfw": [
      "ass",
      "hentai",
      "milf",
      "oral",
      "paizuri",
      "ecchi",
      "ero",
    ],
  };

  static listAllTags(): void {
    console.log(`\n${bold(brightCyan("Available Tags:"))}\n`);

    console.log(
      `${bold(green("Safe Tags:"))} ${white("(suitable for all audiences)")}`,
    );
    this.TAGS.versatile.forEach((tag) => {
      console.log(`  ${green("•")} ${white(tag)}`);
    });

    console.log(
      `\n${bold(brightRed("NSFW/Explicit Tags:"))} ${
        yellow("(18+ content only)")
      }`,
    );
    this.TAGS.nsfw.forEach((tag) => {
      console.log(
        `  ${brightRed("•")} ${white(tag)} ${brightRed("[EXPLICIT]")}`,
      );
    });

    console.log(`\n${yellow("Usage:")} ${white("--tags=tag1,tag2,tag3")}`);
    console.log(`${yellow("Example:")} ${white("--tags=maid,waifu,uniform")}`);
    console.log(
      `${yellow("NSFW Example:")} ${white("--tags=ecchi,oppai")} ${
        brightRed("(automatically enables --nsfw)")
      }\n`,
    );
  }

  static async fetchRandomImage(
    config: Config,
  ): Promise<WaifuApiResponse["images"][0] | null> {
    let tagsToUse: string[];

    // If custom tags are specified, use them exclusively
    if (config.customTags && config.customTags.length > 0) {
      tagsToUse = config.customTags;
      Logger.info(`Using custom tags: ${tagsToUse.join(", ")}`);
    } else {
      // Use default tags based on NSFW setting
      const tagCategory = config.includeNsfw
        ? [...this.TAGS.versatile, ...this.TAGS.nsfw]
        : this.TAGS.versatile;
      tagsToUse = [tagCategory[Math.floor(Math.random() * tagCategory.length)]];
    }

    Logger.info(`Fetching waifu with tags: ${tagsToUse.join(", ")}...`);

    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        const params = {
          included_tags: tagsToUse,
          height: ">=2000",
        };

        const queryParams = new URLSearchParams();
        for (const key in params) {
          const value = params[key as keyof typeof params];
          if (Array.isArray(value)) {
            value.forEach((v) => queryParams.append(key, v));
          } else {
            queryParams.set(key, value);
          }
        }

        const requestUrl = `${this.API_URL}?${queryParams.toString()}`;
        Logger.debug(`Request URL: ${requestUrl}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        const response = await fetch(requestUrl, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API request failed with status: ${response.status}`);
        }

        const data: WaifuApiResponse = await response.json();
        const image = data.images?.[0];

        if (!image || !image.url) {
          throw new Error("No image found in API response");
        }

        Logger.success(`Successfully fetched image: ${image.url}`);
        return image;
      } catch (error) {
        Logger.warn(
          `Attempt ${attempt}/${config.maxRetries} failed: ${
            (error as Error).message
          }`,
        );

        if (attempt === config.maxRetries) {
          Logger.error("All retry attempts failed", error as Error);
          return null;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        Logger.info(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return null;
  }
}

// Image processor and display manager
class ImageProcessor {
  static async downloadImage(
    url: string,
    timeout: number,
  ): Promise<Uint8Array> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
      }

      const buffer = new Uint8Array(await response.arrayBuffer());
      Logger.info(
        `Downloaded image: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`,
      );
      return buffer;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  static async displayImage(buffer: Uint8Array, config: Config): Promise<void> {
    const tmpFile = await Deno.makeTempFile({
      suffix: ".jpg",
      prefix: "waifu-",
    });

    try {
      await Deno.writeFile(tmpFile, buffer);

      const args = ["-c", "-b"];

      if (config.colors) {
        args.push("--colors");
      }

      if (config.fill) {
        args.push("--fill");
      }

      args.push(tmpFile);

      Logger.debug(`jp2a command: jp2a ${args.join(" ")}`);

      const jp2a = new Deno.Command("jp2a", {
        args: args,
        stdout: "inherit",
        stderr: "piped",
      });

      const output = await jp2a.output();

      if (output.code !== 0) {
        const errorText = new TextDecoder().decode(output.stderr);
        throw new Error(`jp2a failed: ${errorText}`);
      }
    } finally {
      try {
        await Deno.remove(tmpFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  static async saveImage(
    buffer: Uint8Array,
    url: string,
    outputDir: string,
  ): Promise<void> {
    const urlParts = url.split("/");
    const fileName = urlParts[urlParts.length - 1] || `waifu-${Date.now()}.jpg`;
    const savePath = `${outputDir}/${fileName}`;

    try {
      await Deno.stat(savePath);
      Logger.debug(`Image already exists: ${savePath}`);
    } catch {
      await Deno.writeFile(savePath, buffer);
      Logger.success(`Saved image: ${savePath}`);
    }
  }
}

// Utility classes for UI components
class TerminalUtils {
  static getTerminalWidth(): number {
    try {
      return Deno.consoleSize().columns;
    } catch {
      return 80; // fallback width
    }
  }

  static wrapText(text: string, width: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if ((currentLine + " " + word).length <= width) {
        currentLine = currentLine ? currentLine + " " + word : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) lines.push(currentLine);
    return lines;
  }

  static displayCaption(image: WaifuApiResponse["images"][0]): void {
    const terminalWidth = this.getTerminalWidth();
    const separator = "=".repeat(terminalWidth);

    console.log("\n" + brightCyan(separator));

    // First line: Artist name and Twitter link
    let artistLine = "";
    if (image.artist) {
      artistLine = `🎨 Artist: ${bold(white(image.artist.name))}`;
      if (image.artist.twitter) {
        artistLine += ` | 🐦 ${brightCyan(image.artist.twitter)}`;
      }
    } else {
      artistLine = `🎨 Artist: ${white("Unknown")}`;
    }

    console.log(artistLine);

    // Second line: Tag descriptions
    if (image.tags && image.tags.length > 0) {
      const descriptions = image.tags
        .map((tag) => tag.description)
        .filter((desc) => desc && desc.trim())
        .join(" • ");

      if (descriptions) {
        const tagLines = this.wrapText(`🏷️  ${descriptions}`, terminalWidth);
        tagLines.forEach((line) => console.log(yellow(line)));
      }
    }

    console.log(brightCyan(separator) + "\n");
  }

  static async displayProgressBar(
    totalSeconds: number,
    _message: string,
  ): Promise<void> {
    const terminalWidth = this.getTerminalWidth();
    const barWidth = Math.min(60, Math.floor(terminalWidth * 0.6)); // Use 60% of terminal width, max 60 chars
    const updateInterval = 10; // ms
    const totalUpdates = (totalSeconds * 1000) / updateInterval;

    for (let i = 0; i <= totalUpdates; i++) {
      const progress = i / totalUpdates;
      const filledWidth = Math.floor(progress * barWidth);
      const emptyWidth = barWidth - filledWidth;

      // Create gradient bar
      let bar = "";
      for (let j = 0; j < filledWidth; j++) {
        bar += bgBrightWhite("█");
      }

      bar += "░".repeat(emptyWidth);

      // Calculate padding to center the bar
      const padding = Math.floor((terminalWidth - barWidth) / 2);
      const centeredBar = " ".repeat(padding) + bar;

      const encoder = new TextEncoder();
      await Deno.stdout.write(encoder.encode(`\r${centeredBar}`));

      if (i < totalUpdates) {
        await new Promise((resolve) => setTimeout(resolve, updateInterval));
      }
    }

    console.log(); // NOTE: New line after progress bar completes. Avoids shifting the first line of the next output.
  }
}

// Main application class
class TTYWaifu {
  private config: Config;
  private isRunning = true;

  constructor(config: Config) {
    this.config = config;
    this.setupSignalHandlers();
  }

  private setupSignalHandlers(): void {
    // Handle Ctrl+C gracefully
    Deno.addSignalListener("SIGINT", () => {
      Logger.info("Received SIGINT, shutting down gracefully...");

      // NOTE: Blocks the exit until the progress bar completes
      // Which blocks the TUI for X seconds
      //this.isRunning = false;

      // Exit immediately
      Deno.exit(0);
    });
  }

  async run(): Promise<void> {
    Logger.info("Starting TTY Waifu...");
    Logger.info(`Configuration: ${JSON.stringify(this.config, null, 2)}`);

    // Ensure output directory exists
    try {
      await Deno.mkdir(this.config.outputDir, { recursive: true });
    } catch (error) {
      Logger.error(
        `Failed to create output directory: ${this.config.outputDir}`,
        error as Error,
      );
      return;
    }

    while (this.isRunning) {
      try {
        const image = await WaifuFetcher.fetchRandomImage(this.config);

        if (!image) {
          Logger.warn("Failed to fetch image, retrying in 5 seconds...");
          await this.sleep(5000);
          continue;
        }

        const imageBuffer = await ImageProcessor.downloadImage(
          image.url,
          this.config.timeout,
        );

        await ImageProcessor.displayImage(imageBuffer, this.config);

        // Display caption if requested
        if (this.config.caption) {
          TerminalUtils.displayCaption(image);
        }

        if (!this.config.noSave) {
          await ImageProcessor.saveImage(
            imageBuffer,
            image.url,
            this.config.outputDir,
          );
        }

        if (this.isRunning) {
          await TerminalUtils.displayProgressBar(
            this.config.intervalSeconds,
            "Next image in",
          );
        }
      } catch (error) {
        Logger.error("Unexpected error in main loop", error as Error);
        await this.sleep(5000);
      }
    }

    Logger.info("TTY Waifu shut down complete");
  }

  private async sleep(ms: number): Promise<void> {
    let remaining = ms;
    while (remaining > 0 && this.isRunning) {
      const sleepTime = Math.min(remaining, 1000);
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
      remaining -= sleepTime;
    }
  }
}

// Help message and argument parsing
function getColoredHelpMessage(): string {
  return `
${bold(brightCyan("TTY Waifu"))} ${white("-")} ${
    green("Terminal Waifu Slideshow Viewer")
  }

${
    yellow(
      "A terminal-based waifu slideshow that fetches images from the Waifu API",
    )
  }
${yellow("and displays them using jp2a.")}

${bold(brightCyan("Usage:"))}

${white("deno run --allow-net --allow-read --allow-write --allow-run")} ${
    bold("tty-waifu.ts")
  } ${green("[options]")}

${bold("OR")}

${white("chmod +x tty-waifu.ts")}
${white("./")}${bold("tty-waifu.ts")} ${green("[options]")}

${bold(brightCyan("Options:"))}
  ${green("--nsfw")}            ${white("Include NSFW tags")} ${
    brightRed("(default: false)")
  }
  ${green("--interval=N")}      ${
    white("Set interval between images in seconds")
  } ${brightRed("(default: 10)")}
  ${green("--dir=DIR")}         ${
    white("Set output directory for saved images")
  } ${brightRed("(default: ./waifus)")}
  ${green("--no-save")}         ${white("Do not save images to disk")}
  ${green("--tags=TAG1,TAG2")}  ${
    white("Fetch only images with these specific tags")
  } ${yellow("(e.g., --tags=maid,waifu,uniform)")}
  ${green("--colors")}          ${white("Display image in color")} ${
    yellow("(requires jp2a)")
  }
  ${green("--fill")}            ${white("Fill the terminal with the image")} ${
    yellow("(requires jp2a)")
  }
  ${green("--caption")}         ${
    white("Display image caption with artist info and tags")
  }
  ${green("--list-tags")}       ${white("Show all available tags and exit")}
  ${green("--help")}            ${white("Show this help message")}

${bold(brightCyan("Examples:"))}
  ${
    white(
      "deno run --allow-net --allow-read --allow-write --allow-run tty-waifu.ts",
    )
  } ${green("--colors --caption")}
  ${
    white(
      "deno run --allow-net --allow-read --allow-write --allow-run tty-waifu.ts",
    )
  } ${green("--nsfw --interval=5")}
  ${
    white(
      "deno run --allow-net --allow-read --allow-write --allow-run tty-waifu.ts",
    )
  } ${green("--tags=maid,uniform --caption")}

${bold(brightCyan("Environment Variables:"))}
  ${green("DEBUG=true")}        ${white("Enable all logging output")} ${
    yellow("(INFO, SUCCESS, WARN, ERROR, DEBUG)")
  }
                    ${
    brightRed("Without DEBUG=true, only the progress bar and caption are shown")
  }
`;
}

// Main execution function
async function main(): Promise<void> {
  try {
    // Show help if requested
    if (Deno.args.includes("--help") || Deno.args.includes("-h")) {
      console.log(getColoredHelpMessage());
      Deno.exit(0);
    }

    // List tags if requested
    if (Deno.args.includes("--list-tags")) {
      WaifuFetcher.listAllTags();
      Deno.exit(0);
    }

    // Check dependencies
    await DependencyChecker.checkAllDependencies();

    // Parse configuration
    const config = ConfigManager.parseArgs();

    // Start the application
    const app = new TTYWaifu(config);
    await app.run();
  } catch (error) {
    Logger.error("Fatal error during startup", error as Error);
    Deno.exit(1);
  }
}

// Run the application
if (import.meta.main) {
  await main();
}
