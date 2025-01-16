import React, { useState, useRef } from "react";
import CheckIcon from "./assets/check.svg";
import Sun from "./assets/sun.svg";
import Moon from "./assets/moon.svg";
import Favicon from "./assets/favicon.svg";

const ColorAnalyzer = () => {
  const rgbToHsl = (r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h,
      s,
      l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return [h * 360, s * 100, l * 100];
  };

  const isGrayish = (r, g, b) => {
    const tolerance = 30;
    return (
      Math.abs(r - g) < tolerance &&
      Math.abs(g - b) < tolerance &&
      Math.abs(r - b) < tolerance
    );
  };

  const calculateVibrancy = (color) => {
    const [r, g, b] = color.match(/\d+/g).map(Number);
    const [h, s, l] = rgbToHsl(r, g, b);

    const grayPenalty = isGrayish(r, g, b) ? 0.3 : 1;
    const saturationWeight = s / 100;
    const lightnessWeight = 1 - Math.abs(l - 50) / 50;

    return saturationWeight * lightnessWeight * grayPenalty;
  };

  // ... rest of the existing color analysis functions ...
  const getLuminance = (bgColor) => {
    const matches = bgColor.match(/\d+/g);
    if (!matches || matches.length !== 3) return "black";

    const [r, g, b] = matches.map(Number);

    const rs = r / 255;
    const gs = g / 255;
    const bs = b / 255;

    const rsRGB =
      rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
    const gsRGB =
      gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
    const bsRGB =
      bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);

    return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
  };

  const getTextColor = (bgColor) => {
    const luminance = getLuminance(bgColor);
    return luminance > 0.5 ? "black" : "white";
  };

  const getColorDifference = (color1, color2) => {
    const [r1, g1, b1] = color1.match(/\d+/g).map(Number);
    const [r2, g2, b2] = color2.match(/\d+/g).map(Number);

    const [h1, s1, l1] = rgbToHsl(r1, g1, b1);
    const [h2, s2, l2] = rgbToHsl(r2, g2, b2);

    const hueDiff = Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2)) / 180;
    const satDiff = Math.abs(s1 - s2) / 100;
    const lightDiff = Math.abs(l1 - l2) / 100;

    return hueDiff * 0.5 + satDiff * 0.25 + lightDiff * 0.25;
  };

  const filterSimilarColors = (colors, threshold = 0.15) => {
    const result = [];

    for (const color of colors) {
      let isDistinct = true;

      for (const existingColor of result) {
        const difference = getColorDifference(color, existingColor);
        if (difference < threshold) {
          isDistinct = false;
          break;
        }
      }

      if (isDistinct) {
        result.push(color);
      }
    }

    return result;
  };

  const analyzeDominantColors = (imageUrl, maxDimension = 400) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        let newWidth = img.width;
        let newHeight = img.height;

        if (img.width > img.height) {
          if (img.width > maxDimension) {
            newWidth = maxDimension;
            newHeight = (img.height * maxDimension) / img.width;
          }
        } else {
          if (img.height > maxDimension) {
            newHeight = maxDimension;
            newWidth = (img.width * maxDimension) / img.height;
          }
        }

        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        const imageData = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        ).data;
        const colorMap = new Map();
        const vibrancyMap = new Map();

        for (let i = 0; i < imageData.length; i += 4) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const a = imageData[i + 3];

          if (a === 0) continue;

          const rgb = `rgb(${r},${g},${b})`;
          colorMap.set(rgb, (colorMap.get(rgb) || 0) + 1);

          if (!vibrancyMap.has(rgb)) {
            const vibrancy = calculateVibrancy(rgb);
            vibrancyMap.set(rgb, vibrancy);
          }
        }

        const validColors = Array.from(colorMap.entries()).filter(([color]) => {
          const [r, g, b] = color.match(/\d+/g).map(Number);
          const brightness = (r + g + b) / 3;
          return brightness > 20 && brightness < 235;
        });

        validColors.sort((a, b) => {
          const scoreA =
            (colorMap.get(a[0]) / imageData.length) * vibrancyMap.get(a[0]);
          const scoreB =
            (colorMap.get(b[0]) / imageData.length) * vibrancyMap.get(b[0]);
          return scoreB - scoreA;
        });

        const result = {
          allColors: validColors.map(([color]) => ({
            color,
            vibrancy: vibrancyMap.get(color),
          })),
          dimensions: {
            original: { width: img.width, height: img.height },
            resized: { width: newWidth, height: newHeight },
          },
        };

        resolve(result);
      };

      img.onerror = (error) => {
        reject(new Error("Failed to load image: " + error.message));
      };

      img.src = imageUrl;
    });
  };

  const [darkMode, setDarkMode] = useState(true);

  const [imageUrl, setImageUrl] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [usedURLbtn, setUsedURLbtn] = useState(false);
  const [allColors, setAllColors] = useState([]);
  const [vibrancyThreshold, setVibrancyThreshold] = useState(0.2);
  const [isDragging, setIsDragging] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");
  const fileInputRef = useRef(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const filteredColors = allColors
    .filter(({ vibrancy }) => vibrancy >= vibrancyThreshold)
    .map(({ color }) => color)
    .slice(0, 20);

  const distinctColors = filterSimilarColors(filteredColors);
  const textColors = distinctColors.map((color) => getTextColor(color));

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    if (urlInput.trim()) {
      setUsedURLbtn(true);
      setImageUrl(urlInput);
      analyzeImage(urlInput);
    }
  };

  const handleFileUpload = (files) => {
    const file = files[0];
    if (file && file.type.startsWith("image/")) {
      setUsedURLbtn(false);
      setUrlInput("");
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result);
        analyzeImage(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setError("Please upload a valid image file.");
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };

  const handleCopyColor = async (color) => {
    try {
      await navigator.clipboard.writeText(color);
      setCopyFeedback(color);
      setTimeout(() => setCopyFeedback(""), 1500);
    } catch (err) {
      console.error("Failed to copy color: ", err);
      setError("Failed to copy color to clipboard");
    }
  };

  const analyzeImage = async (url) => {
    setIsLoading(true);
    setError("");
    try {
      const result = await analyzeDominantColors(url);
      setAllColors(result.allColors);
    } catch (err) {
      setError("Failed to analyze image. Please try another image or URL.");
    } finally {
      setIsLoading(false);
    }
  };

  function rgbToHex(rgb) {
    // Extract the numeric values using a regular expression
    const result = rgb.match(/\d+/g);

    if (!result || result.length !== 3) {
      throw new Error("Invalid RGB format");
    }

    // Convert each RGB component to a two-digit hexadecimal string
    const [r, g, b] = result.map(Number);
    const toHex = (value) => value.toString(16).padStart(2, "0");

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div
      className={`${
        darkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900"
      } min-h-screen transition-colors duration-200 `}
    >
      <div className="max-w-4xl mx-auto p-6 space-y-6  pb-12">
        <div className="flex align-middle my-4 ">
          <img src={Favicon} width={35} />
          <h1 className="text-2xl w-full font-bold  text-center">
            Image Color Analyzer
          </h1>
          <button
            onClick={toggleDarkMode}
            className={`p-2 h-min rounded-full ${
              darkMode
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-gray-200 hover:bg-gray-300"
            } transition-colors duration-200`}
            aria-label={
              darkMode ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {darkMode ? (
              <img src={Sun} width={20} />
            ) : (
              <img src={Moon} width={20} />
            )}
          </button>
        </div>

        <form onSubmit={handleUrlSubmit} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Enter image URL..."
              className={`flex-1 p-2 border rounded ${
                darkMode
                  ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200"
              disabled={isLoading}
            >
              Analyze URL
            </button>
          </div>
        </form>

        <div
          className="space-y-2"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex items-center justify-center w-full ">
            <label
              className={`bg-transparent w-full flex flex-col items-center px-4 py-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors duration-200 ${
                isDragging
                  ? "border-blue-500 "
                  : darkMode
                  ? "border-gray-600  "
                  : "border-gray-300  "
              }`}
            >
              <div className="flex flex-col items-center gap-4 select-none pointer-events-none ">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  id="Layer_1"
                  data-name="Layer 1"
                  viewBox="0 0 24 24"
                  width="34"
                  fill={darkMode ? "#d1d5db " : "#4b5563 "}
                >
                  <path d="M9,5.5c0-.83,.67-1.5,1.5-1.5s1.5,.67,1.5,1.5-.67,1.5-1.5,1.5-1.5-.67-1.5-1.5Zm15-.5v6c0,2.76-2.24,5-5,5H10c-2.76,0-5-2.24-5-5V5C5,2.24,7.24,0,10,0h9c2.76,0,5,2.24,5,5ZM7,11c0,.77,.29,1.47,.77,2.01l5.24-5.24c.98-.98,2.69-.98,3.67,0l1.04,1.04c.23,.23,.62,.23,.85,0l3.43-3.43v-.38c0-1.65-1.35-3-3-3H10c-1.65,0-3,1.35-3,3v6Zm15,0v-2.79l-2.02,2.02c-.98,.98-2.69,.98-3.67,0l-1.04-1.04c-.23-.23-.61-.23-.85,0l-4.79,4.79c.12,.02,.24,.02,.37,.02h9c1.65,0,3-1.35,3-3Zm-3.91,7.04c-.53-.15-1.08,.17-1.23,.7l-.29,1.06c-.21,.77-.71,1.42-1.41,1.81-.7,.4-1.51,.5-2.28,.29l-8.68-2.38c-1.6-.44-2.54-2.09-2.1-3.69l.96-3.56c.14-.53-.17-1.08-.7-1.23-.53-.14-1.08,.17-1.23,.7L.18,15.29c-.73,2.66,.84,5.42,3.5,6.15l8.68,2.38c.44,.12,.89,.18,1.33,.18,.86,0,1.7-.22,2.47-.66,1.16-.66,1.99-1.73,2.35-3.02l.29-1.06c.15-.53-.17-1.08-.7-1.23Z" />
                </svg>

                <span
                  className={`text-sm ${
                    darkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Drag and drop image here or click to upload
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                disabled={isLoading}
              />
            </label>
          </div>
        </div>

        {allColors.length > 0 && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <label
                className={`block text-sm font-medium ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Vibrancy Threshold: {(vibrancyThreshold * 100).toFixed(0)}%
              </label>
              <div className="relative flex items-center">
                <div
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  <svg
                    fill={darkMode ? "#d1d5db" : "#374151 "}
                    width="15"
                    xmlns="http://www.w3.org/2000/svg"
                    id="Outline"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12,0A12,12,0,1,0,24,12,12.013,12.013,0,0,0,12,0Zm0,22A10,10,0,1,1,22,12,10.011,10.011,0,0,1,12,22Z" />
                    <path d="M12,10H11a1,1,0,0,0,0,2h1v6a1,1,0,0,0,2,0V12A2,2,0,0,0,12,10Z" />
                    <circle cx="12" cy="6.5" r="1.5" />
                  </svg>
                </div>
                {showTooltip && (
                  <div className="flex flex-col absolute top-full mt-2 w-60 p-2 bg-gray-800 text-white text-sm rounded shadow-lg">
                    <p>
                      This controls how vibrant a color must be to be
                      considered.
                    </p>
                    <p className="opacity-70 font-light">
                      A higher threshold will show the most vibrant colors, even
                      though they may be less common.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={vibrancyThreshold}
              onChange={(e) => setVibrancyThreshold(parseFloat(e.target.value))}
              className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                darkMode ? "bg-gray-700" : "bg-gray-200"
              }`}
            />
          </div>
        )}

        {error && (
          <div className="text-center flex flex-col gap-2">
            <div
              className={` p-2 rounded ${
                darkMode ? "bg-red-900 text-white" : "bg-red-100 text-red-500"
              } flex items-center justify-center gap-3`}
            >
              <svg
                fill={darkMode ? "white" : "#ef4444"}
                viewBox="0 0 24 24"
                width="18"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="m12 14a1 1 0 0 1 -1-1v-3a1 1 0 1 1 2 0v3a1 1 0 0 1 -1 1zm-1.5 2.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1 -3 0z" />
                <path d="m10.23 3.216c.75-1.425 2.79-1.425 3.54 0l8.343 15.852c.701 1.332-.263 2.932-1.77 2.932h-16.686c-1.505 0-2.47-1.6-1.77-2.931zm10.114 16.784-8.344-15.853-8.344 15.853z" />
              </svg>
              {error}
            </div>
            {usedURLbtn && (
              <div
                className={`p-2 rounded flex items-center justify-center gap-3 ${
                  darkMode
                    ? "bg-gray-800 text-gray-300"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <svg
                  fill={darkMode ? "#d1d5db" : "#374151 "}
                  width="15"
                  xmlns="http://www.w3.org/2000/svg"
                  id="Outline"
                  viewBox="0 0 24 24"
                >
                  <path d="M12,0A12,12,0,1,0,24,12,12.013,12.013,0,0,0,12,0Zm0,22A10,10,0,1,1,22,12,10.011,10.011,0,0,1,12,22Z" />
                  <path d="M12,10H11a1,1,0,0,0,0,2h1v6a1,1,0,0,0,2,0V12A2,2,0,0,0,12,10Z" />
                  <circle cx="12" cy="6.5" r="1.5" />
                </svg>
                Sometimes URLs are restricted. Try downloading the image first
                and then uploading it.
              </div>
            )}
          </div>
        )}

        {copyFeedback && (
          <div className="fixed top-0 right-5 bg-gray-800 text-white px-4 py-2 rounded shadow-lg flex gap-2">
            <img src={CheckIcon} width={16} />
            Copied {copyFeedback}
          </div>
        )}

        {isLoading && (
          <div className="text-center py-4">Analyzing image...</div>
        )}

        {imageUrl && (
          <div className="space-y-4">
            <img
              src={imageUrl}
              alt="Uploaded preview"
              className="max-w-full h-auto rounded mx-auto max-h-96"
            />

            {!error && distinctColors.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold my-2">
                  Dominant colors (click to copy):
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 ">
                  {distinctColors.map((color, index) => (
                    <div
                      key={index}
                      className="h-24 rounded flex flex-col gap-2 items-center justify-center"
                      style={{
                        backgroundColor: color,
                        color: textColors[index],
                      }}
                    >
                      <button
                        onClick={() => handleCopyColor(rgbToHex(color))}
                        className="flex flex-col hover:scale-105 focus:outline-none transition-transform"
                      >
                        <p>{rgbToHex(color)}</p>
                      </button>
                      <button
                        onClick={() => handleCopyColor(color)}
                        className="flex flex-col hover:scale-105 focus:outline-none transition-transform"
                      >
                        <p>{color}</p>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pt-10 flex flex-col items-center gap-2">
          <h4
            className={` text-sm ${
              darkMode ? "text-gray-400" : "text-gray-500"
            } text-center`}
          >
            Caleb Einolf
          </h4>
          <div className="flex justify-center gap-2">
            <a href="https://github.com/calebeinolf" target="_blank">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22px"
                viewBox="0 0 1024 1024"
                fill="none"
              >
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z"
                  transform="scale(64)"
                  fill={darkMode ? "#9ca3af " : "#6b7280 "}
                />
              </svg>
            </a>
            <a href="https://www.linkedin.com/in/calebeinolf/" target="_blank">
              <svg
                class="svg-icon"
                width="22px"
                viewBox="0 0 1024 1024"
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                style={{ transform: "scale(1.15)" }}
              >
                <path
                  d="M385.024 706.368V406.72H285.376v299.68h99.616zM335.2 365.76c34.72 0 56.384-23.04 56.384-51.808-0.64-29.376-21.664-51.744-55.68-51.744-34.144 0-56.384 22.4-56.384 51.744 0 28.8 21.632 51.84 55.072 51.84z m409.024 340.608v-171.808c0-92.064-49.152-134.912-114.656-134.912-52.928 0-76.608 29.12-89.792 49.504v-42.496h-99.616c1.312 28.16 0 299.712 0 299.712h99.616v-167.36c0-8.96 0.64-17.92 3.264-24.256 7.168-17.92 23.584-36.448 51.072-36.448 36.064 0 50.56 27.456 50.56 67.744v160.352h99.584zM512 64c247.424 0 448 200.544 448 448 0 247.424-200.576 448-448 448-247.456 0-448-200.576-448-448C64 264.544 264.544 64 512 64z"
                  fill={darkMode ? "#9ca3af " : "#6b7280 "}
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorAnalyzer;
