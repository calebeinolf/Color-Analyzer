import React, { useState, useRef, useEffect } from "react";
import Favicon from "./assets/favicon.png";
import CheckIcon from "./components/check-icon.jsx";
import CloseIcon from "./components/close-icon.jsx";
import CopyIcon from "./components/copy-icon.jsx";
import CropIcon from "./assets/cropIcon.svg";
import Cookies from "js-cookie";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const LoadingIndicator = () => {
  return (
    <div className="text-center py-2 relative">
      <div className="inline-flex items-center gap-3">
        <span>Analyzing colors</span>
        <span className="inline-flex space-x-1">
          <span
            className="w-1 h-1 bg-current rounded-full"
            style={{
              animation: "highBounce 0.8s infinite",
              animationDelay: "0ms",
            }}
          />
          <span
            className="w-1 h-1 bg-current rounded-full"
            style={{
              animation: "highBounce 0.8s infinite",
              animationDelay: "200ms",
            }}
          />
          <span
            className="w-1 h-1 bg-current rounded-full"
            style={{
              animation: "highBounce 0.8s infinite",
              animationDelay: "400ms",
            }}
          />
        </span>
      </div>

      <style>{`
          @keyframes highBounce {
            0%, 100% {
              transform: translateY(1px);
              animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
            }
            50% {
              transform: translateY(-6px);
              animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
            }
          }
        `}</style>
    </div>
  );
};

const ColorAnalyzer = () => {
  const CropModal = ({ isOpen, onClose, imageUrl, onCropComplete }) => {
    const [crop, setCrop] = useState({
      unit: "%",
      width: 70,
      height: 70,
      aspect: undefined,
    });
    const [completedCrop, setCompletedCrop] = useState(null);
    const imgRef = useRef(null);

    const getCroppedImg = () => {
      // Use completedCrop if available, otherwise use initial crop values
      const cropToUse = completedCrop || {
        x: 0,
        y: 0,
        width: imgRef.current.width * 0.7,
        height: imgRef.current.height * 0.7,
        unit: "px",
      };
      console.log("cropToUse", cropToUse);
      if (!cropToUse || !imgRef.current) return;

      const canvas = document.createElement("canvas");
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      canvas.width = cropToUse.width;
      canvas.height = cropToUse.height;
      const ctx = canvas.getContext("2d");

      ctx.drawImage(
        imgRef.current,
        cropToUse.x * scaleX,
        cropToUse.y * scaleY,
        cropToUse.width * scaleX,
        cropToUse.height * scaleY,
        0,
        0,
        cropToUse.width,
        cropToUse.height
      );

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(URL.createObjectURL(blob));
        }, "image/jpeg");
      });
    };

    const handleCropComplete = async () => {
      const cropToUse = completedCrop || crop;
      if (cropToUse.height > 20 && cropToUse.width > 20) {
        const croppedImageUrl = await getCroppedImg();
        onCropComplete(croppedImageUrl);
        onClose();
      } else {
        alert("Please crop the image to at least 20x20 pixels.");
      }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div
          className={`bg-${
            darkMode ? "gray-800" : "white"
          } p-6 rounded-lg max-w-4xl max-h-[90vh] mx-4 overflow-y-auto`}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Crop Image</h2>
            <button
              onClick={onClose}
              className={`p-2 ${
                darkMode ? "hover:bg-gray-700" : "hover:bg-gray-200"
              } rounded-full`}
            >
              <CloseIcon
                currentColor={darkMode ? "white" : "black"}
                width={12}
              />
            </button>
          </div>

          <div className="relative">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
            >
              <img
                ref={imgRef}
                src={imageUrl}
                className="max-h-[60vh] h-64 w-auto mx-auto"
              />
            </ReactCrop>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded ${
                darkMode
                  ? "bg-gray-700 hover:bg-gray-600"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleCropComplete}
              className="px-4 py-2 rounded"
              style={{ background: themeColor, color: themeTextColor }}
            >
              Apply Crop
            </button>
          </div>
        </div>
      </div>
    );
  };

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
    const bgLuminance = getLuminance(bgColor);
    const whiteLuminance = 1.0; // White's luminance is 1
    const blackLuminance = 0.0; // Black's luminance is 0

    // Calculate contrast ratios
    const whiteContrast = (whiteLuminance + 0.05) / (bgLuminance + 0.05);
    const blackContrast = (bgLuminance + 0.05) / (blackLuminance + 0.05);

    // Return the color with better contrast (minimum 4.5:1 as per WCAG)
    return whiteContrast > blackContrast ? "white" : "black";
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

        // Scale image if needed
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
        const totalPixels = imageData.length / 4;

        // First pass: collect colors and their frequencies
        for (let i = 0; i < imageData.length; i += 4) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const a = imageData[i + 3];

          if (a === 0) continue;

          // Moderate quantization
          const quantizedR = Math.round(r / 16) * 16;
          const quantizedG = Math.round(g / 16) * 16;
          const quantizedB = Math.round(b / 16) * 16;

          const rgb = `rgb(${quantizedR},${quantizedG},${quantizedB})`;
          colorMap.set(rgb, (colorMap.get(rgb) || 0) + 1);
        }

        // Filter and analyze colors
        const colorAnalysis = Array.from(colorMap.entries())
          .map(([color, count]) => {
            const [r, g, b] = color.match(/\d+/g).map(Number);
            const [h, s, l] = rgbToHsl(r, g, b);
            const frequency = count / totalPixels;
            const vibrancy = calculateColorVibrancy(r, g, b, s, l);

            return {
              color,
              frequency,
              vibrancy,
              saturation: s,
              lightness: l,
            };
          })
          .filter(({ frequency, saturation, lightness }) => {
            // Keep colors that are either:
            // 1. Common enough (>0.5% of image)
            // 2. Have some saturation and aren't too light/dark
            return (
              frequency > 0.05 ||
              (frequency > 0.005 &&
                saturation > 5 &&
                lightness > 5 &&
                lightness < 95)
            );
          })
          .sort((a, b) => b.frequency - a.frequency); // Sort by frequency first

        const result = {
          allColors: colorAnalysis,
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

  const calculateColorVibrancy = (r, g, b, s, l) => {
    // Simplified vibrancy calculation
    const saturationFactor = s / 100;
    const lightnessFactor = 1 - Math.abs((l - 50) / 50);
    const grayFactor = isGrayish(r, g, b) ? 0.3 : 1;

    return saturationFactor * lightnessFactor * grayFactor;
  };

  const generateColorPalette = (dominantColors) => {
    if (!dominantColors || dominantColors.length === 0) return null;

    // Filter out white and black (very light and very dark colors)
    const filteredColors = dominantColors.filter((color) => {
      const [r, g, b] = color.match(/\d+/g).map(Number);
      const brightness = (r + g + b) / 3;
      return brightness > 30 && brightness < 225; // Adjust thresholds as needed
    });

    if (filteredColors.length === 0) return null;

    // Get primary color (most dominant after filtering)
    const primary = filteredColors[0];
    const [primaryR, primaryG, primaryB] = primary.match(/\d+/g).map(Number);
    const [primaryH, primaryS, primaryL] = rgbToHsl(
      primaryR,
      primaryG,
      primaryB
    );

    // Find secondary color (next most dominant that's different enough from primary)
    let secondary = null;
    for (let i = 1; i < filteredColors.length; i++) {
      const color = filteredColors[i];
      const difference = getColorDifference(primary, color);
      if (difference > 0.25) {
        // Increased threshold for more distinct secondary
        secondary = color;
        break;
      }
    }
    if (!secondary && filteredColors.length > 1) {
      secondary = filteredColors[1]; // Fallback to second most dominant
    }

    // Generate complementary color (opposite of primary on color wheel)
    const complementaryHue = (primaryH + 180) % 360;
    const complementary = `rgb(${hslToRgb(
      complementaryHue / 360,
      primaryS / 100,
      primaryL / 100
    ).join(",")})`;

    // Find accent color (most vibrant that's different from primary and secondary)
    let accent = null;
    let highestVibrancy = -1;

    for (const { color, vibrancy } of allColors) {
      // Skip if too similar to primary or secondary
      if (getColorDifference(color, primary) < 0.2) continue;
      if (secondary && getColorDifference(color, secondary) < 0.2) continue;

      // Check if this is the most vibrant color we've found
      if (vibrancy > highestVibrancy) {
        const [r, g, b] = color.match(/\d+/g).map(Number);
        const brightness = (r + g + b) / 3;
        // Ensure it's not too light or dark
        if (brightness > 30 && brightness < 225) {
          accent = color;
          highestVibrancy = vibrancy;
        }
      }
    }

    // Fallback for accent if none found
    if (!accent) {
      const accentHue = (primaryH + 120) % 360;
      accent = `rgb(${hslToRgb(
        accentHue / 360,
        Math.min(primaryS / 100 + 0.2, 1),
        primaryL / 100
      ).join(",")})`;
    }

    return {
      primary,
      secondary:
        secondary ||
        `rgb(${hslToRgb(
          ((primaryH + 30) % 360) / 360,
          primaryS / 100,
          primaryL / 100
        ).join(",")})`,
      complementary,
      accent,
    };
  };

  const hslToRgb = (h, s, l) => {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  };

  const [imageUrl, setImageUrl] = useState("");
  const [originalImageUrl, setOriginalImageUrl] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [usedURLbtn, setUsedURLbtn] = useState(false);
  const [allColors, setAllColors] = useState([]);
  const [vibrancyThreshold, setVibrancyThreshold] = useState(0.35);
  const [isDragging, setIsDragging] = useState(false);
  const [isHoveringImage, setIsHoveringImage] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");
  const fileInputRef = useRef(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showInputs, setShowInputs] = useState(true);
  const [showAbout, setShowAbout] = useState(true);
  const [themePanelOpen, setThemePanelOpen] = useState(false);
  const [themeColor, setThemeColor] = useState("#3b82f6");
  const [copyTimeout, setCopyTimeout] = useState(null);
  const [themeTextColor, setThemeTextColor] = useState(
    getTextColor(themeColor)
  );
  const [showVibrancyTip, setShowVibrancyTip] = useState(false);

  const [darkMode, setDarkMode] = useState(false);
  const [systemMode, setSystemMode] = useState(true);

  // Detect system preference
  const getSystemPreference = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  useEffect(() => {
    // Load user preference from cookies
    const savedPreference = Cookies.get("themePreference");

    if (savedPreference) {
      if (savedPreference === "light") {
        setDarkMode(false);
        setSystemMode(false);
      } else if (savedPreference === "dark") {
        setDarkMode(true);
        setSystemMode(false);
      } else {
        setSystemMode(true);
        setDarkMode(getSystemPreference());
      }
    } else {
      // Default to system preference
      setSystemMode(true);
      setDarkMode(getSystemPreference());
    }

    // Listen for system preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (systemMode) {
        setDarkMode(mediaQuery.matches);
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [systemMode]);

  const savePreference = (preference) => {
    Cookies.set("themePreference", preference, { expires: 365 }); // Save preference for a year
  };

  const handleLightMode = () => {
    setDarkMode(false);
    setSystemMode(false);
    savePreference("light");
    setThemePanelOpen(false);
  };

  const handleDarkMode = () => {
    setDarkMode(true);
    setSystemMode(false);
    savePreference("dark");
    setThemePanelOpen(false);
  };

  const handleSystemMode = () => {
    setSystemMode(true);
    setDarkMode(getSystemPreference());
    savePreference("system");
    setThemePanelOpen(false);
  };

  const HoverMenuButton = () => {
    const menuRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
          setThemePanelOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setThemePanelOpen(!themePanelOpen)}
          className={`p-2 h-min rounded-full ${
            darkMode
              ? "bg-gray-700 hover:bg-gray-600"
              : "bg-gray-200 hover:bg-gray-300"
          } `}
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
          >
            <path d="m12 22c5.5228475 0 10-4.4771525 10-10s-4.4771525-10-10-10-10 4.4771525-10 10 4.4771525 10 10 10zm0-1.5v-17c4.6944204 0 8.5 3.80557963 8.5 8.5 0 4.6944204-3.8055796 8.5-8.5 8.5z" />
          </svg>
        </button>

        {themePanelOpen && (
          <div
            className={`z-10 absolute right-0 top-full mt-2 w-36 ${
              darkMode ? "bg-gray-700 text-white" : "bg-gray-200 text-black"
            }  rounded-lg shadow-lg overflow-hidden `}
          >
            <button
              className={`flex items-center gap-2 w-full px-4 py-2 text-left ${
                darkMode ? "hover:bg-gray-600" : "hover:bg-gray-300"
              }  transition-colors duration-200`}
              onClick={handleLightMode}
            >
              <svg
                enable-background="new 0 0 91 91"
                width="20"
                fill="currentColor"
                viewBox="0 0 91 91"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="m45.5 23.5c-12.1 0-22 9.9-22 22s9.9 22 22 22 22-9.9 22-22-9.9-22-22-22zm0 36c-7.7 0-14-6.3-14-14s6.3-14 14-14 14 6.3 14 14-6.3 14-14 14z" />
                <path d="m45.5 16.2c2.2 0 4-1.8 4-4v-8.1c0-2.2-1.8-4-4-4s-4 1.8-4 4v8.1c0 2.3 1.8 4 4 4z" />
                <path d="m86.9 41.5h-8.1c-2.2 0-4 1.8-4 4s1.8 4 4 4h8.1c2.2 0 4-1.8 4-4s-1.8-4-4-4z" />
                <path d="m45.5 74.8c-2.2 0-4 1.8-4 4v8.1c0 2.2 1.8 4 4 4s4-1.8 4-4v-8.1c0-2.3-1.8-4-4-4z" />
                <path d="m16.2 45.5c0-2.2-1.8-4-4-4h-8.1c-2.2 0-4 1.8-4 4s1.8 4 4 4h8.1c2.3 0 4-1.8 4-4z" />
                <path d="m69 26c1 0 2-.4 2.8-1.2l5.8-5.8c1.6-1.6 1.6-4.1 0-5.7s-4.1-1.6-5.7 0l-5.8 5.8c-1.6 1.6-1.6 4.1 0 5.7.9.8 1.9 1.2 2.9 1.2z" />
                <path d="m71.8 66.2c-1.6-1.6-4.1-1.6-5.7 0s-1.6 4.1 0 5.7l5.8 5.8c.8.8 1.8 1.2 2.8 1.2s2-.4 2.8-1.2c1.6-1.6 1.6-4.1 0-5.7z" />
                <path d="m19.2 66.2-5.8 5.8c-1.6 1.6-1.6 4.1 0 5.7.8.8 1.8 1.2 2.8 1.2s2-.4 2.8-1.2l5.8-5.8c1.6-1.6 1.6-4.1 0-5.7-1.5-1.6-4.1-1.6-5.6 0z" />
                <path d="m19.2 24.8c.7.8 1.8 1.2 2.8 1.2s2-.4 2.8-1.2c1.6-1.6 1.6-4.1 0-5.7l-5.8-5.8c-1.6-1.6-4.1-1.6-5.7 0s-1.6 4.1 0 5.7z" />
              </svg>
              Light
              {!darkMode && !systemMode && (
                <CheckIcon
                  currentColor={darkMode ? "white" : "black"}
                  width={10}
                />
              )}
            </button>
            <button
              className={`flex items-center gap-2 w-full px-4 py-2 text-left ${
                darkMode ? "hover:bg-gray-600" : "hover:bg-gray-300"
              }  transition-colors duration-200`}
              onClick={handleDarkMode}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                id="Layer_1"
                data-name="Layer 1"
                viewBox="0 0 24 24"
                width="20"
                fill="currentColor"
              >
                <path d="M15,24a12.021,12.021,0,0,1-8.914-3.966,11.9,11.9,0,0,1-3.02-9.309A12.122,12.122,0,0,1,13.085.152a13.061,13.061,0,0,1,5.031.205,2.5,2.5,0,0,1,1.108,4.226c-4.56,4.166-4.164,10.644.807,14.41a2.5,2.5,0,0,1-.7,4.32A13.894,13.894,0,0,1,15,24Zm.076-22a10.793,10.793,0,0,0-1.677.127,10.093,10.093,0,0,0-8.344,8.8A9.927,9.927,0,0,0,7.572,18.7,10.476,10.476,0,0,0,18.664,21.43a.5.5,0,0,0,.139-.857c-5.929-4.478-6.4-12.486-.948-17.449a.459.459,0,0,0,.128-.466.49.49,0,0,0-.356-.361A10.657,10.657,0,0,0,15.076,2Z" />
              </svg>
              Dark
              {darkMode && !systemMode && (
                <CheckIcon
                  currentColor={darkMode ? "white" : "black"}
                  width={10}
                />
              )}
            </button>
            <button
              className={`flex items-center gap-2 w-full px-4 py-2 text-left ${
                darkMode ? "hover:bg-gray-600" : "hover:bg-gray-300"
              }  transition-colors duration-200`}
              onClick={handleSystemMode}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                id="Outline"
                viewBox="0 0 24 24"
                width="20"
                fill="currentColor"
              >
                <path d="M19,1H5A5.006,5.006,0,0,0,0,6v8a5.006,5.006,0,0,0,5,5h6v2H7a1,1,0,0,0,0,2H17a1,1,0,0,0,0-2H13V19h6a5.006,5.006,0,0,0,5-5V6A5.006,5.006,0,0,0,19,1ZM5,3H19a3,3,0,0,1,3,3v7H2V6A3,3,0,0,1,5,3ZM19,17H5a3,3,0,0,1-2.816-2H21.816A3,3,0,0,1,19,17Z" />
              </svg>
              System
              {systemMode && (
                <CheckIcon
                  currentColor={darkMode ? "white" : "black"}
                  width={10}
                />
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  const filteredColors = allColors
    .filter(({ vibrancy }) => vibrancy >= vibrancyThreshold)
    .sort((a, b) => b.frequency - a.frequency)
    .map(({ color }) => color)
    .slice(0, 20);

  useEffect(() => {
    if (filteredColors.length > 0) {
      setThemeColor(filteredColors[0]);
      setThemeTextColor(getTextColor(filteredColors[0]));
    }
  }, [filteredColors]);

  const distinctColors = filterSimilarColors(filteredColors);
  const textColors = distinctColors.map((color) => getTextColor(color));

  const colorPalette =
    distinctColors.length > 0 ? generateColorPalette(distinctColors) : null;

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    if (urlInput.trim()) {
      setUsedURLbtn(true);
      setOriginalImageUrl(urlInput); // Store original
      setImageUrl(urlInput);
      setShowInputs(false);
      setVibrancyThreshold(0.35);
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
        setOriginalImageUrl(reader.result); // Store original
        setImageUrl(reader.result);
        setShowInputs(false);
        setVibrancyThreshold(0.35);
        analyzeImage(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setError("Please upload a valid image file.");
    }
  };

  const handleClearImage = () => {
    setImageUrl("");
    setOriginalImageUrl("");
    setUrlInput("");
    setAllColors([]);
    setError("");
    setShowInputs(true);
    setThemeColor("#3b82f6");
    setThemeTextColor("#ffffff");
    setVibrancyThreshold(0.35);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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

      // Clear any existing timeout
      if (copyTimeout) {
        clearTimeout(copyTimeout);
      }

      // Set the feedback and create new timeout
      setCopyFeedback(color);
      const newTimeout = setTimeout(() => setCopyFeedback(""), 1500);
      setCopyTimeout(newTimeout);
    } catch (err) {
      console.error("Failed to copy color: ", err);
      setError("Failed to copy color to clipboard");
    }
  };

  useEffect(() => {
    return () => {
      if (copyTimeout) {
        clearTimeout(copyTimeout);
      }
    };
  }, [copyTimeout]);

  useEffect(() => {
    const hasSeenTip = Cookies.get("hasSeenVibrancyTip");
    if (!hasSeenTip && allColors.length > 0) {
      setShowVibrancyTip(true);
      Cookies.set("hasSeenVibrancyTip", "true", { expires: 365 });
    }
  }, [allColors]);

  const analyzeImage = async (url) => {
    setIsLoading(true);
    setError("");

    const analyzeWithThreshold = async (threshold) => {
      try {
        const result = await analyzeDominantColors(url);
        const colors = result.allColors
          .filter(({ vibrancy }) => vibrancy >= threshold)
          .sort((a, b) => b.frequency - a.frequency)
          .map(({ color }) => color)
          .slice(0, 20);

        const distinctColors = filterSimilarColors(colors);
        return distinctColors;
      } catch (err) {
        throw err;
      }
    };

    try {
      let currentThreshold = vibrancyThreshold;
      let distinctColors = await analyzeWithThreshold(currentThreshold);

      // If no colors found, gradually decrease threshold until we find some
      while (distinctColors.length === 0 && currentThreshold > 0) {
        currentThreshold = Math.max(0, currentThreshold - 0.05);
        distinctColors = await analyzeWithThreshold(currentThreshold);
      }

      if (currentThreshold !== vibrancyThreshold) {
        setVibrancyThreshold(currentThreshold);
      }

      const result = await analyzeDominantColors(url);
      setAllColors(result.allColors);
    } catch (err) {
      setError("Failed to analyze image. Please try another image or URL.");
      handleClearImage();
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

  const sliderStyles = {
    trackColor: darkMode ? "#4A5568" : "#E2E8F0",
    thumbColor: themeColor,
  };

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  const handleCropComplete = (croppedImageUrl) => {
    setImageUrl(croppedImageUrl);
    analyzeImage(croppedImageUrl);
  };

  return (
    <div
      className={`${
        darkMode ? "relative bg-gray-900 text-white" : "bg-white text-gray-900"
      } min-h-screen transition-colors duration-200 `}
    >
      <div className="max-w-4xl min-h-dvh mx-auto p-6 py-10 px-3 sm:px-4 md:px-6 flex flex-col">
        <div className="flex-1 space-y-6 ">
          {/* Header */}
          <div className="flex align-middle items-center my-4 px-3 gap-3">
            <img
              src={Favicon}
              width={32}
              height={32}
              className="max-h-[32px]"
            />
            <h1 className="text-2xl w-full font-semibold  text-center">
              Image Color Analyzer
            </h1>

            <HoverMenuButton />
          </div>

          {/* Inputs */}
          <div
            className={`p-3 rounded-xl ${
              darkMode ? "bg-gray-800" : "bg-gray-100"
            } ${!showInputs && "cursor-pointer"}`}
            onClick={() => !showInputs && setShowInputs(!showInputs)}
          >
            <div className=" w-full flex items-center justify-between">
              <div className="pl-1 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  id="Outline"
                  viewBox="0 0 24 24"
                  width="16"
                  fill={darkMode ? "#ffffff" : "#000000"}
                >
                  <path d="M19,0H5A5.006,5.006,0,0,0,0,5V19a5.006,5.006,0,0,0,5,5H19a5.006,5.006,0,0,0,5-5V5A5.006,5.006,0,0,0,19,0ZM5,2H19a3,3,0,0,1,3,3V19a2.951,2.951,0,0,1-.3,1.285l-9.163-9.163a5,5,0,0,0-7.072,0L2,14.586V5A3,3,0,0,1,5,2ZM5,22a3,3,0,0,1-3-3V17.414l4.878-4.878a3,3,0,0,1,4.244,0L20.285,21.7A2.951,2.951,0,0,1,19,22Z" />
                  <path d="M16,10.5A3.5,3.5,0,1,0,12.5,7,3.5,3.5,0,0,0,16,10.5Zm0-5A1.5,1.5,0,1,1,14.5,7,1.5,1.5,0,0,1,16,5.5Z" />
                </svg>
                <h2 className="font-medium">Upload Image</h2>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInputs(!showInputs);
                }}
                className={`w-[34px] h-[34px] flex items-center justify-center rounded-full ${
                  darkMode
                    ? "bg-gray-700 hover:bg-gray-600"
                    : "bg-gray-200 hover:bg-gray-300"
                } transition-colors duration-200`}
              >
                <svg
                  version="1.1"
                  viewBox="0 0 26.002 45.999"
                  width="7px"
                  fill={darkMode ? "#ffffff" : "#000000"}
                  className={`transform transition-transform duration-300 ${
                    showInputs ? "rotate-90" : "-rotate-90 translate-y-[1px]"
                  }`}
                >
                  <path d="M24.998,40.094c1.338,1.352,1.338,3.541,0,4.893c-1.338,1.35-3.506,1.352-4.846,0L1.004,25.447  c-1.338-1.352-1.338-3.543,0-4.895L20.152,1.014c1.34-1.352,3.506-1.352,4.846,0c1.338,1.352,1.338,3.541,0,4.893L9.295,23  L24.998,40.094z" />
                </svg>
              </button>
            </div>

            <div
              // ref={contentRef}
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                showInputs ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="space-y-6">
                <form onSubmit={handleUrlSubmit} className="space-y-2">
                  <div className="flex gap-3 pt-6 flex-col min-[440px]:flex-row">
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
                      className="px-4 py-2  rounded  transition-colors duration-200"
                      style={{ background: themeColor, color: themeTextColor }}
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
                  <div className="flex items-center justify-center w-full">
                    <label
                      className={`bg-transparent w-full flex flex-col items-center px-4 py-6 rounded-lg cursor-pointer transition-colors duration-200 border-2 border-dashed `}
                      style={{
                        borderColor: isDragging
                          ? themeColor
                          : darkMode
                          ? "#4b5563 "
                          : "#d1d5db ",
                      }}
                      // style={{
                      //   backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='8' ry='8' stroke='%23${
                      //     isDragging ? "3b82f6" : darkMode ? "4b5563" : "d1d5db"
                      //   }FF' stroke-width='3.5' stroke-dasharray='6%2c 14' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e")`,
                      // }}
                    >
                      <div className="flex flex-col items-center select-none pointer-events-none">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          width="34"
                          fill={darkMode ? "#d1d5db" : "#4b5563"}
                        >
                          <path d="M9,5.5c0-.83,.67-1.5,1.5-1.5s1.5,.67,1.5,1.5-.67,1.5-1.5,1.5-1.5-.67-1.5-1.5Zm15-.5v6c0,2.76-2.24,5-5,5H10c-2.76,0-5-2.24-5-5V5C5,2.24,7.24,0,10,0h9c2.76,0,5,2.24,5,5ZM7,11c0,.77,.29,1.47,.77,2.01l5.24-5.24c.98-.98,2.69-.98,3.67,0l1.04,1.04c.23,.23,.62,.23,.85,0l3.43-3.43v-.38c0-1.65-1.35-3-3-3H10c-1.65,0-3,1.35-3,3v6Zm15,0v-2.79l-2.02,2.02c-.98,.98-2.69,.98-3.67,0l-1.04-1.04c-.23-.23-.61-.23-.85,0l-4.79,4.79c.12,.02,.24,.02,.37,.02h9c1.65,0,3-1.35,3-3Zm-3.91,7.04c-.53-.15-1.08,.17-1.23,.7l-.29,1.06c-.21,.77-.71,1.42-1.41,1.81-.7,.4-1.51,.5-2.28,.29l-8.68-2.38c-1.6-.44-2.54-2.09-2.1-3.69l.96-3.56c.14-.53-.17-1.08-.7-1.23-.53-.14-1.08,.17-1.23,.7L.18,15.29c-.73,2.66,.84,5.42,3.5,6.15l8.68,2.38c.44,.12,.89,.18,1.33,.18,.86,0,1.7-.22,2.47-.66,1.16-.66,1.99-1.73,2.35-3.02l.29-1.06c.15-.53-.17-1.08-.7-1.23Z" />
                        </svg>
                        <span
                          className={`mt-4 text-sm ${
                            darkMode ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          Drag and drop image here
                        </span>
                        <div className="flex gap-2">
                          <span
                            className={`text-sm ${
                              darkMode ? "text-gray-300" : "text-gray-600"
                            }`}
                          >
                            or click to upload
                          </span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            id="Outline"
                            viewBox="0 0 24 24"
                            width="12"
                            fill={darkMode ? "#d1d5db" : "#374151"}
                            stroke={darkMode ? "#d1d5db" : "#374151"}
                          >
                            <path d="M11.007,2.578,11,18.016a1,1,0,0,0,1,1h0a1,1,0,0,0,1-1l.007-15.421,2.912,2.913a1,1,0,0,0,1.414,0h0a1,1,0,0,0,0-1.414L14.122.879a3,3,0,0,0-4.244,0L6.667,4.091a1,1,0,0,0,0,1.414h0a1,1,0,0,0,1.414,0Z" />
                            <path d="M22,17v4a1,1,0,0,1-1,1H3a1,1,0,0,1-1-1V17a1,1,0,0,0-1-1H1a1,1,0,0,0-1,1v4a3,3,0,0,0,3,3H21a3,3,0,0,0,3-3V17a1,1,0,0,0-1-1h0A1,1,0,0,0,22,17Z" />
                          </svg>
                        </div>
                        <span
                          className={`text-sm pt-2 ${
                            darkMode ? "text-gray-500" : "text-gray-400"
                          }`}
                        >
                          .png, .jpg, .jpeg, .webp, .svg, .gif
                        </span>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/png, image/jpeg, image/webp, image/jpg, image/svg, image/gif"
                        onChange={(e) => handleFileUpload(e.target.files)}
                        disabled={isLoading}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error */}
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
            <div
              onClick={() => setCopyFeedback(false)}
              className="cursor-default fixed top-0 right-5 bg-gray-700 bg-opacity-70 backdrop-blur-md text-white px-4 py-2 rounded shadow-lg flex gap-2"
            >
              <CheckIcon currentColor={"white"} width={15} /> Copied{" "}
              {copyFeedback}
            </div>
          )}

          {isLoading && <LoadingIndicator />}

          {/* Image */}
          {imageUrl && (
            <div className="flex justify-center space-y-4 ">
              <div
                className="relative w-fit p-3"
                onMouseEnter={() => setIsHoveringImage(true)}
                onMouseLeave={() => setIsHoveringImage(false)}
              >
                {isHoveringImage && (
                  <div className="absolute top-5 right-5 flex gap-1">
                    <button
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-800 hover:bg-opacity-70 bg-opacity-50 backdrop-blur-md transition-all ease-linear duration-75"
                      onClick={() => setIsCropModalOpen(true)}
                    >
                      <img src={CropIcon} width={16} height={16} />
                    </button>

                    <button
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-800 hover:bg-opacity-70 bg-opacity-50 backdrop-blur-md transition-all ease-linear duration-75"
                      onClick={handleClearImage}
                    >
                      <CloseIcon currentColor={"white"} width={10} />
                    </button>
                  </div>
                )}

                <img
                  src={imageUrl}
                  alt="Uploaded preview"
                  className="max-w-full h-auto rounded mx-auto max-h-64 min-h-32"
                />
              </div>
            </div>
          )}

          {/* Vibrancy Slider */}
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
                    <div className="z-10 flex flex-col absolute top-full mt-2 w-60 p-2 bg-gray-800 text-white text-sm rounded shadow-lg">
                      <p>
                        This controls how vibrant a color must be to be
                        considered.
                      </p>
                      <p className="opacity-70 font-light">
                        i.e. the higher the threshold, the more vibrant colors
                        must be.
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
                onChange={(e) =>
                  setVibrancyThreshold(parseFloat(e.target.value))
                }
                style={{
                  // width: "100%",
                  // height: "8px",
                  background: sliderStyles.trackColor,
                  // borderRadius: "10px",
                  // WebkitAppearance: "none",
                }}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer custom-slider"
              />

              <style jsx>{`
                .custom-slider::-webkit-slider-thumb {
                  appearance: none;
                  background: ${sliderStyles.thumbColor};
                  border: 3px solid ${darkMode ? "#111827" : "#ffffff"};
                  height: 20px;
                  width: 20px;
                  border-radius: 50%;
                  cursor: pointer;
                  transition-property: background;
                  transition-duration: 0.4s;
                }

                .custom-slider::-webkit-slider-runnable-track {
                  // border-radius: 10px;
                }
              `}</style>

              {showVibrancyTip && (
                <div className={`pt-4 flex items-center justify-center`}>
                  <div className={` flex items-center gap-3 animate-fade-in`}>
                    <span className="text-sm opacity-60">
                      ↑ Try changing the vibrancy threshold to get different
                      results
                    </span>
                    <button onClick={() => setShowVibrancyTip(false)}>
                      <CloseIcon
                        currentColor={darkMode ? "white" : "black"}
                        width={9}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Colors */}
          {imageUrl && (
            <div className="space-y-4 pb-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Dominant colors:</h2>
                <h2
                  className={`text-sm ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  } `}
                >
                  Click colors to copy
                </h2>
              </div>
              {!error && distinctColors.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 ">
                  {distinctColors.map((color, index) => (
                    <div
                      key={index}
                      className="py-4 text-sm rounded flex flex-col gap-1 items-center justify-center"
                      style={{
                        backgroundColor: color,
                        color: textColors[index],
                      }}
                    >
                      <button
                        onClick={() => handleCopyColor(rgbToHex(color))}
                        className="flex items-center gap-1 hover:underline focus:outline-none transition-transform group translate-x-[-8.5px]"
                      >
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <CopyIcon
                            currentColor={textColors[index]}
                            width={14}
                          />
                        </span>
                        <p>{rgbToHex(color)}</p>
                      </button>
                      <button
                        onClick={() => handleCopyColor(color)}
                        className="flex items-center gap-1 hover:underline focus:outline-none transition-transform group translate-x-[-8.5px]"
                      >
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <CopyIcon
                            currentColor={textColors[index]}
                            width={14}
                          />
                        </span>
                        <p>{color}</p>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {distinctColors.length === 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 ">
                  <div
                    className={`py-4 text-sm rounded flex flex-col gap-1 items-center justify-center ${
                      darkMode ? "bg-gray-800 " : "bg-gray-100 "
                    } `}
                  >
                    <p>No colors</p>
                    <p className="opacity-50">Try turning vibrancy down</p>
                  </div>
                </div>
              )}

              <h2 className="text-xl font-semibold my-2">
                Suggested Color Palette:
              </h2>
              {!error && colorPalette && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Object.entries(colorPalette).map(([name, color]) => (
                    <div key={name}>
                      <div
                        className="py-4 text-sm rounded flex flex-col gap-1 items-center justify-center"
                        style={{
                          backgroundColor: color,
                          color: getTextColor(color),
                        }}
                      >
                        <button
                          onClick={() => handleCopyColor(rgbToHex(color))}
                          className="flex items-center gap-1 hover:underline focus:outline-none transition-transform group translate-x-[-8.5px]"
                        >
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <CopyIcon
                              currentColor={getTextColor(color)}
                              width={14}
                            />
                          </span>
                          <p>{rgbToHex(color)}</p>
                        </button>
                        <button
                          onClick={() => handleCopyColor(color)}
                          className="flex items-center gap-1 hover:underline focus:outline-none transition-transform group translate-x-[-8.5px]"
                        >
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <CopyIcon
                              currentColor={getTextColor(color)}
                              width={14}
                            />
                          </span>
                          <p>{color}</p>
                        </button>
                      </div>
                      <p className="text-sm capitalize font-medium text-center mt-1">
                        {name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {!colorPalette && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 ">
                  <div
                    className={`py-4 text-sm rounded flex flex-col gap-1 items-center justify-center ${
                      darkMode ? "bg-gray-800 " : "bg-gray-100 "
                    } `}
                  >
                    <p>No colors</p>
                    <p className="opacity-50">Try turning vibrancy down</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* About */}
          <div
            className={`p-3 rounded-xl ${
              darkMode ? "bg-gray-800" : "bg-gray-100"
            } `}
          >
            {/* Title */}
            <div
              className=" w-full flex items-center justify-between cursor-pointer"
              onClick={() => setShowAbout(!showAbout)}
            >
              <div className="flex items-center gap-2">
                <svg
                  fill={darkMode ? "white" : "black"}
                  width="16"
                  xmlns="http://www.w3.org/2000/svg"
                  id="Outline"
                  viewBox="0 0 24 24"
                >
                  <path d="M12,0A12,12,0,1,0,24,12,12.013,12.013,0,0,0,12,0Zm0,22A10,10,0,1,1,22,12,10.011,10.011,0,0,1,12,22Z" />
                  <path d="M12,10H11a1,1,0,0,0,0,2h1v6a1,1,0,0,0,2,0V12A2,2,0,0,0,12,10Z" />
                  <circle cx="12" cy="6.5" r="1.5" />
                </svg>
                <h2 className={`font-medium `}>How to Use</h2>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAbout(!showAbout);
                }}
                className={`w-[34px] h-[34px] flex items-center justify-center rounded-full ${
                  darkMode
                    ? "bg-gray-700 hover:bg-gray-600"
                    : "bg-gray-200 hover:bg-gray-300"
                } transition-colors duration-200`}
              >
                <svg
                  version="1.1"
                  viewBox="0 0 26.002 45.999"
                  width="7px"
                  fill={darkMode ? "#d1d5db" : "#374151 "}
                  className={`transform transition-transform duration-300 ${
                    showAbout ? "rotate-90" : "-rotate-90 translate-y-[1px]"
                  }`}
                >
                  <path d="M24.998,40.094c1.338,1.352,1.338,3.541,0,4.893c-1.338,1.35-3.506,1.352-4.846,0L1.004,25.447  c-1.338-1.352-1.338-3.543,0-4.895L20.152,1.014c1.34-1.352,3.506-1.352,4.846,0c1.338,1.352,1.338,3.541,0,4.893L9.295,23  L24.998,40.094z" />
                </svg>
              </button>
            </div>

            {/* Hideable content */}
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                showAbout ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="pt-4 space-y-4 m-2 mt-0">
                <p>
                  This tool helps you analyze the dominant colors in any image.
                  Simply upload an image and it will extract the most prominent
                  colors, displaying them as hex codes that you can easily copy.
                </p>
                <p>
                  If the colors are different than you expected, try playing
                  with the vibrancy threshold slider.
                </p>
                <h2 className="text-lg font-semibold">Features:</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    className={`${
                      darkMode ? "bg-gray-700" : "bg-gray-200"
                    } p-4 rounded-lg`}
                  >
                    <div className="flex gap-2">
                      <svg version="1.2" viewBox="0 0 144 144" width="20">
                        <g>
                          <g id="Layer_1">
                            <path
                              d="M144,96.3c0,24.3-19.7,44-44,44s-20.4-3.8-28-10.1c9.7-8.1,15.9-20.2,15.9-33.9s-.2-5-.6-7.4c14.5-5.4,25.4-18.2,28-33.9,16.7,6.2,28.7,22.3,28.7,41.2Z"
                              fill="blue"
                            />
                            <path
                              d="M115.3,55c-2.6,15.7-13.5,28.5-28,33.9-1.8-10.6-7.4-19.9-15.3-26.5,7.6-6.3,17.4-10.1,28-10.1s10.5,1,15.3,2.7Z"
                              fill="#f0f"
                            />
                            <path
                              d="M116,47.7c0,2.5-.2,4.9-.6,7.3-4.8-1.8-9.9-2.7-15.3-2.7-10.6,0-20.4,3.8-28,10.1-7.6-6.3-17.4-10.1-28-10.1s-10.6,1-15.3,2.7c-.4-2.4-.6-4.8-.6-7.3C28,23.4,47.7,3.8,72,3.8s44,19.7,44,44Z"
                              fill="red"
                            />
                            <path
                              d="M87.9,96.3c0,13.6-6.2,25.8-15.9,33.9-9.7-8.1-15.9-20.2-15.9-33.9s.2-5,.6-7.3c4.8,1.8,9.9,2.7,15.3,2.7s10.6-1,15.3-2.8c.4,2.4.6,4.8.6,7.4Z"
                              fill="aqua"
                            />
                            <path
                              d="M87.3,88.9c-4.8,1.8-9.9,2.8-15.3,2.8s-10.5-1-15.3-2.7c1.8-10.6,7.4-20,15.3-26.5,7.9,6.6,13.5,15.9,15.3,26.5Z"
                              fill="#fff"
                            />
                            <path
                              d="M72,62.4c-7.9,6.6-13.6,15.9-15.3,26.5-14.5-5.4-25.4-18.3-28-33.9,4.8-1.8,9.9-2.7,15.3-2.7,10.7,0,20.4,3.8,28,10.1Z"
                              fill="#ff0"
                            />
                            <path
                              d="M72,130.1c-7.6,6.3-17.4,10.1-28,10.1C19.7,140.2,0,120.6,0,96.3s11.9-35,28.6-41.2c2.6,15.7,13.5,28.5,28,33.9-.4,2.4-.6,4.8-.6,7.3,0,13.6,6.2,25.8,15.9,33.9Z"
                              fill="lime"
                            />
                          </g>
                        </g>
                      </svg>
                      <h2 className="text-lg font-medium">Dominant Colors</h2>
                    </div>
                    <p className="opacity-80 text-sm font-light">
                      The dominant colors are up to 8 of the most prominent
                      colors in the image. They are displayed in the order of
                      their prominence.
                    </p>
                  </div>
                  <div
                    className={`${
                      darkMode ? "bg-gray-700" : "bg-gray-200"
                    } p-4 rounded-lg`}
                  >
                    <div className="flex gap-2">
                      <svg version="1.2" viewBox="0 0 144 144" width="20">
                        <g>
                          <g id="Layer_1">
                            <path
                              fill={
                                colorPalette ? colorPalette.primary : themeColor
                              }
                              d="M35,3.3h0c17.5,0,31.7,14.2,31.7,31.7v25.2c0,3.6-2.9,6.5-6.5,6.5h-25.2c-17.5,0-31.7-14.2-31.7-31.7h0C3.3,17.5,17.5,3.3,35,3.3Z"
                            />

                            <path
                              fill={
                                colorPalette
                                  ? colorPalette.secondary
                                  : themeColor + "dd"
                              }
                              d="M109,3.3h0c17.5,0,31.7,14.2,31.7,31.7h0c0,17.5-14.2,31.7-31.7,31.7h-25.2c-3.6,0-6.5-2.9-6.5-6.5v-25.2c0-17.5,14.2-31.7,31.7-31.7Z"
                            />
                            <path
                              fill={
                                colorPalette
                                  ? colorPalette.complementary
                                  : themeColor + "88"
                              }
                              d="M35,77.3h25.2c3.6,0,6.5,2.9,6.5,6.5v25.2c0,17.5-14.2,31.7-31.7,31.7h0c-17.5,0-31.7-14.2-31.7-31.7h0c0-17.5,14.2-31.7,31.7-31.7Z"
                            />
                            <path
                              fill={
                                colorPalette
                                  ? colorPalette.accent
                                  : themeColor + "55"
                              }
                              d="M83.8,77.3h25.2c17.5,0,31.7,14.2,31.7,31.7h0c0,17.5-14.2,31.7-31.7,31.7h0c-17.5,0-31.7-14.2-31.7-31.7v-25.2c0-3.6,2.9-6.5,6.5-6.5Z"
                            />
                          </g>
                        </g>
                      </svg>
                      <h2 className="text-lg font-medium">Suggested Palette</h2>
                    </div>
                    <p className="opacity-80 text-sm font-light">
                      The suggested palette is a list of up to 8 colors that are
                      similar to the dominant colors. They are displayed in the
                      order of their prominence.
                    </p>
                  </div>
                  <div
                    className={`${
                      darkMode ? "bg-gray-700" : "bg-gray-200"
                    } p-4 rounded-lg`}
                  >
                    <div className="flex gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        version="1.1"
                        viewBox="0 0 720 720"
                        width="20"
                      >
                        <g id="Layer_1">
                          <path
                            fill={themeColor}
                            d="M369.9,497.7c0,14.9-2.8,29.2-8,42.3-16.9,43.1-59,73.7-108,73.7s-91.1-30.6-108-73.7c-5.2-13.1-8-27.4-8-42.3s2.8-29.2,8-42.3c16.9-43.1,59-73.8,108-73.8s91.1,30.6,108,73.8c5.2,13.1,8,27.4,8,42.3Z"
                          />
                          <path
                            fill={themeColor}
                            d="M582.2,222.3c0,14.9-2.8,29.2-8,42.3-16.9,43.1-59,73.7-108,73.7s-91.1-30.6-108-73.7c-5.2-13.1-8-27.4-8-42.3s2.8-29.2,8-42.3c16.9-43.1,59-73.8,108-73.8s91.1,30.6,108,73.8c5.2,13.1,8,27.4,8,42.3Z"
                          />
                          <g>
                            <path d="M124.7,467.6c-2.2,9.7-3.4,19.7-3.4,30.1s1.2,20.4,3.4,30.1H30.1c-16.6,0-30.1-13.5-30.1-30.1s13.5-30.1,30.1-30.1h94.7Z" />
                            <path d="M720,497.7c0,16.6-13.5,30.1-30.1,30.1h-306.9c2.2-9.7,3.4-19.7,3.4-30.1s-1.2-20.4-3.4-30.1h306.9c16.6,0,30.1,13.5,30.1,30.1Z" />
                          </g>
                          <g>
                            <path d="M337,192.2c-2.2,9.7-3.4,19.7-3.4,30.1s1.2,20.4,3.4,30.1H30.1c-16.6,0-30.1-13.5-30.1-30.1s13.5-30.1,30.1-30.1h306.9Z" />
                            <path d="M720,222.3c0,16.6-13.5,30.1-30.1,30.1h-94.7c2.2-9.7,3.4-19.7,3.4-30.1s-1.2-20.4-3.4-30.1h94.7c16.6,0,30.1,13.5,30.1,30.1Z" />
                          </g>
                        </g>
                      </svg>
                      <h2 className="text-lg font-medium">Vibrancy Slider</h2>
                    </div>
                    <p className="opacity-80 text-sm font-light">
                      The vibrancy slider controls how vibrant a color must be
                      to be considered. A higher threshold will require more
                      vibrant colors while a lower threshold will consider more
                      muted colors.
                    </p>
                  </div>
                  <div
                    className={`${
                      darkMode ? "bg-gray-700" : "bg-gray-200"
                    } p-4 rounded-lg`}
                  >
                    <div className="flex gap-1">
                      <svg
                        fill={darkMode ? "white" : "black"}
                        width="20"
                        viewBox="0 0 24 24"
                      >
                        <path d="M21 16h-3V8.56A2.56 2.56 0 0 0 15.44 6H8V3a1 1 0 0 0-2 0v3H3a1 1 0 0 0 0 2h3v7.44A2.56 2.56 0 0 0 8.56 18H16v3a1 1 0 0 0 2 0v-3h3a1 1 0 0 0 0-2zM8.56 16a.56.56 0 0 1-.56-.56V8h7.44a.56.56 0 0 1 .56.56V16z" />
                      </svg>
                      <h2 className="text-lg font-medium">Cropping Images</h2>
                    </div>
                    <p className="opacity-80 text-sm font-light">
                      Hover over the image and click the crop button to crop the
                      image to focus on desired area.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className=" pt-12 flex flex-col items-center gap-2 mt-auto">
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

      <CropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        imageUrl={originalImageUrl}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
};

export default ColorAnalyzer;
