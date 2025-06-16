# TTY Waifu 🎨

A beautiful terminal-based waifu slideshow that fetches images from the [waifu.im API](https://waifu.im) and displays them as colorful ASCII art using jp2a.

## ✨ Features

- 🖼️ **High-quality anime images** from waifu.im API
- 🎨 **Colorful ASCII art conversion** with jp2a
- 🏷️ **Tag-based filtering** with 16+ available tags
- 📝 **Image captions** with artist info and descriptions
- 🌈 **Animated progress bar** for timing
- 💾 **Automatic image saving** to local directory
- 🔞 **NSFW content support** with explicit warnings
- 🎯 **Custom tag combinations** for precise filtering
- 🖥️ **Terminal-adaptive display** with auto-sizing
- 🔧 **Extensive customization options**

## 📋 Requirements

- **Deno runtime** (v1.30+) - [Install Deno](https://deno.land/manual/getting_started/installation)
- **jp2a** - ASCII art converter
  - macOS: `brew install jp2a`
  - Ubuntu/Debian: `sudo apt-get install jp2a`
  - Arch Linux: `sudo pacman -S jp2a`

## 🚀 Installation

### Method 1: Direct execution (Recommended)

```bash
# Make it executable
chmod +x tty-waifu.ts

# Run it
./tty-waifu.ts --colors --caption
```

### Method 2: Using Deno

```bash
# Run directly with Deno
deno run --allow-net --allow-read --allow-write --allow-run --allow-env \\
  tty-waifu.ts --colors
```

## 📖 Usage

### Basic Usage

```bash
# Simple slideshow with colors
./tty-waifu.ts --colors

# Show captions with artist info
./tty-waifu.ts --colors --caption

# Faster slideshow (5-second intervals)
./tty-waifu.ts --colors --interval=5
```

### Advanced Usage

```bash
# Custom tags for specific content
./tty-waifu.ts --tags=maid,uniform --caption --colors

# NSFW content (18+ only)
./tty-waifu.ts --nsfw --interval=8 --colors

# Fill terminal and don't save images
./tty-waifu.ts --colors --fill --no-save

# Custom output directory
./tty-waifu.ts --colors --dir=~/my-waifus
```

## 🎛️ Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--colors` | Display images in color | false |
| `--fill` | Fill entire terminal with image | false |
| `--caption` | Show artist info and tag descriptions | false |
| `--nsfw` | Include NSFW/explicit content | false |
| `--interval=N` | Seconds between images | 10 |
| `--dir=DIR` | Image save directory | `./waifus` |
| `--no-save` | Don't save images to disk | false |
| `--tags=TAG1,TAG2` | Filter by specific tags | (random) |
| `--list-tags` | Show all available tags | - |
| `--help` | Show help message | - |

## 🏷️ Available Tags

### Safe Tags (All Audiences)

- `maid` - Maid outfits and characters
- `waifu` - General female anime characters
- `uniform` - School/military uniforms
- `selfies` - Selfie-style images
- `marin-kitagawa` - Specific character
- `mori-calliope` - VTuber character
- `raiden-shogun` - Genshin Impact character
- `kamisato-ayaka` - Genshin Impact character
- `oppai` - Focus on chest area

### NSFW Tags (18+ Only)
>
> ⚠️ **Warning**: These tags contain explicit content for adults only

- `ass` - Explicit content
- `hentai` - Adult anime art
- `milf` - Mature characters
- `oral` - Explicit content
- `paizuri` - Explicit content
- `ecchi` - Suggestive content
- `ero` - Erotic content

Refer to to the [waifu.im API documentation](https://docs.waifu.im/) for more details on each tag and their specific content.

## 🌟 Examples

### Basic Slideshow

```bash
# Beautiful colored slideshow with captions
./tty-waifu.ts --colors --caption
```

### Specific Content

```bash
# Only maid characters with uniforms
./tty-waifu.ts --tags=maid,uniform --colors --caption

# Genshin Impact characters
./tty-waifu.ts --tags=raiden-shogun,kamisato-ayaka --colors

# Fast-paced slideshow
./tty-waifu.ts --colors --interval=3 --fill
```

### NSFW Content (18+)

```bash
# NSFW slideshow (auto-enables --nsfw)
./tty-waifu.ts --tags=ecchi,hentai --colors --interval=15

# Explicit content with longer intervals
./tty-waifu.ts --nsfw --colors --interval=20 --no-save
```

## 🔧 Environment Variables

```bash
# Enable verbose debugging output
DEBUG=true ./tty-waifu.ts --colors

# Without DEBUG, only shows progress bar and captions
./tty-waifu.ts --colors --caption
```

## 📁 File Organization

```
root/
├── tty-waifu.ts          # Main script
├── README.md             # Documentation
└── waifus/               # Downloaded images (default)
    ├── image1.jpg
    ├── image2.png
    └── ...
```

## 🎨 Features in Detail

### Image Captions

When using `--caption`, each image displays:

- 🎨 **Artist name** and social media links
- 🏷️ **Tag descriptions** with auto-wrapping
- 🔗 **Source links** when available

### Progress Bar

- ⏱️ **Real-time countdown**
- 📐 **Auto-centered** in terminal

### Smart Tag Handling

- 🔄 **Auto-NSFW detection** - NSFW tags automatically enable adult mode
- 🎯 **Precise filtering** - Use multiple tags for specific content
- 📝 **Tag validation** - Invalid tags are filtered out

## 🛠️ Troubleshooting

### Common Issues

**jp2a not found**

```bash
# Install jp2a first
brew install jp2a  # macOS
sudo apt install jp2a  # Ubuntu/Debian
```

**Permission denied**

```bash
# Make script executable
chmod +x tty-waifu.ts
```

**No images found**

```bash
# Check your tag combination
./tty-waifu.ts --list-tags

# Try with more general tags
./tty-waifu.ts --tags=waifu --colors
```

**Terminal too small**

```bash
# Resize terminal or use --fill
./tty-waifu.ts --colors --fill
```

## 📊 Performance Tips

- Use `--no-save` to avoid disk I/O for temporary viewing
- Increase `--interval` for slower connections
- Use `--fill` for better display on large terminals
- Enable `DEBUG=true` only when troubleshooting

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for:

- 🏷️ New tag suggestions
- 🐛 Bug fixes
- ✨ Feature enhancements
- 📚 Documentation improvements

## 📄 License

GNU General Public License v2.0 (GPL-2.0)
This project is licensed under the GPL-2.0 license. See the [LICENSE](LICENSE) file for details.

## 🙏 Credits

- **[waifu.im API](https://docs.waifu.im/)** - For providing high-quality anime images
- **[jp2a](https://github.com/cslarsen/jp2a)** - For ASCII art conversion
- **[Deno](https://deno.com/)** - For the modern JavaScript/TypeScript runtime

## ⚠️ Disclaimer

This tool is for entertainment purposes only. Please respect:

- 🔞 Age restrictions for NSFW content
- 🎨 Artist copyrights and attribution
- 🌐 API rate limits and terms of service
- 💻 Terminal/system resources

---

**Enjoy your terminal waifu slideshow! (◕‿◕)♡**
