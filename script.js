document.addEventListener("DOMContentLoaded", function () {
  // Inisialisasi tab
  let tabs = document.querySelectorAll(".tab");
  let indicator = document.querySelector(".indicator");
  let panels = document.querySelectorAll(".tab-panel");

  function updateIndicator(tab) {
    indicator.style.width = tab.getBoundingClientRect().width + "px";
    indicator.style.left =
      tab.getBoundingClientRect().left -
      tab.parentElement.getBoundingClientRect().left +
      "px";
  }

  updateIndicator(tabs[0]);

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      let tabTarget = tab.getAttribute("aria-controls");

      tabs.forEach((t) => {
        t.setAttribute("aria-selected", "false");
        t.setAttribute("tabindex", "-1");
      });

      tab.setAttribute("aria-selected", "true");
      tab.setAttribute("tabindex", "0");

      updateIndicator(tab);

      panels.forEach((panel) => {
        let panelId = panel.getAttribute("id");
        if (tabTarget === panelId) {
          panel.classList.remove("invisible", "opacity-0");
          panel.classList.add("visible", "opacity-100");
        } else {
          panel.classList.add("invisible", "opacity-0");
        }
      });
    });
  });

  // CHECKING INPUT IMAGE SIZE
  let uploadField = document.getElementById("imageInput");
  uploadField.onchange = function () {
    if (this.files[0].size < 1000000) {
      alert("Maaf. Size Foto Terlalu Kecil ! Foto Harus Di Atas 1 MB");
      this.value = "";
    }
  };

  // Inisialisasi tampilan input gambar
  const displayImagePreview = (inputElement, previewContainerId) => {
    const file = inputElement.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewContainer = document.getElementById(previewContainerId);
        previewContainer.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-contain rounded-md" />`;
      };
      reader.readAsDataURL(file);
    }
  };

  const originalImageInput = document.getElementById("imageInput");
  const stegoImageInput = document.getElementById("stegoImageInput");

  if (originalImageInput) {
    originalImageInput.addEventListener("change", () => {
      displayImagePreview(originalImageInput, "imageInputDisplay");
    });
  }

  if (stegoImageInput) {
    stegoImageInput.addEventListener("change", () => {
      displayImagePreview(stegoImageInput, "stegoInputDisplay");
    });
  }

  // Fungsi sembunyikan pesan
  function hideMessage() {
    const imageInput = document.getElementById("imageInput");
    const messageInput = document.getElementById("messageInput");
    //Checking input
    if (!imageInput.files[0]) {
      alert("Please select an image.");
      return;
    }
    if (!messageInput.value) {
      alert("Please enter a message.");
      return;
    }

    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    const reader = new FileReader();

    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const message = messageInput.value;
        const messageBits = toBinary(message);
        let bitIndex = 0;

        for (
          let i = 0;
          i < data.length && bitIndex < messageBits.length;
          i += 4
        ) {
          const d = Math.abs(data[i] - data[i + 1]);
          const range = getRange(d);
          const t = Math.floor(Math.log2(range[1] - range[0] + 1));
          const m = parseInt(messageBits.substr(bitIndex, t), 2);
          const newDiff = range[0] + m;

          if (data[i] >= data[i + 1]) {
            data[i] =
              newDiff > d
                ? data[i] + Math.floor((newDiff - d) / 2)
                : data[i] - Math.floor((d - newDiff) / 2);
            data[i + 1] =
              newDiff > d
                ? data[i + 1] - Math.ceil((newDiff - d) / 2)
                : data[i + 1] + Math.ceil((d - newDiff) / 2);
          } else {
            data[i] =
              newDiff > d
                ? data[i] - Math.floor((newDiff - d) / 2)
                : data[i] + Math.floor((d - newDiff) / 2);
            data[i + 1] =
              newDiff > d
                ? data[i + 1] + Math.ceil((newDiff - d) / 2)
                : data[i + 1] - Math.ceil((d - newDiff) / 2);
          }
          bitIndex += t;
        }

        ctx.putImageData(imageData, 0, 0);
        document.getElementById("resultImage").src = canvas.toDataURL();
        document.getElementById("resultImage").style.display = "block";
      };
      img.src = event.target.result;
    };

    reader.readAsDataURL(imageInput.files[0]);
  }

  // Fungsi ekstraksi pesan
  function extractMessage() {
    const stegoImageInput = document.getElementById("stegoImageInput");
    //Checking input
    if (!stegoImageInput.files[0]) {
      alert("Please select an image.");
      return;
    }
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    const reader = new FileReader();

    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let messageBits = "";

        for (let i = 0; i < data.length; i += 4) {
          const d = Math.abs(data[i] - data[i + 1]);
          const range = getRange(d);
          const t = Math.floor(Math.log2(range[1] - range[0] + 1));
          const m = d - range[0];
          messageBits += m.toString(2).padStart(t, "0");

          if (messageBits.length % 8 === 0) {
            const char = fromBinary(messageBits.slice(-8));
            if (char === "\0") break;
          }
        }

        const message = fromBinary(messageBits);
        document.getElementById("extractedMessage").textContent =
          message.replace(/\0.*$/, "");
      };
      img.src = event.target.result;
    };

    reader.readAsDataURL(stegoImageInput.files[0]);
  }

  // Utility functions
  function toBinary(str) {
    return (
      str
        .split("")
        .map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
        .join("") + "00000000"
    ); // null-terminate the string
  }

  function fromBinary(binary) {
    let str = "";
    for (let i = 0; i < binary.length; i += 8) {
      str += String.fromCharCode(parseInt(binary.substr(i, 8), 2));
    }
    return str;
  }

  function getRange(d) {
    if (d >= 0 && d <= 7) return [0, 7];
    if (d >= 8 && d <= 15) return [8, 15];
    if (d >= 16 && d <= 31) return [16, 31];
    if (d >= 32 && d <= 63) return [32, 63];
    if (d >= 64 && d <= 127) return [64, 127];
    if (d >= 128 && d <= 255) return [128, 255];
    return [0, 255];
  }

  function downloadImage() {
    const resultImage = document.getElementById("resultImage");
    const link = document.createElement("a");
    link.href = resultImage.src;
    link.download = "stego_image.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Attach functions to buttons
  document
    .getElementById("hideMessageButton")
    .addEventListener("click", hideMessage);
  document
    .getElementById("extractButton")
    .addEventListener("click", extractMessage);
  document
    .getElementById("downloadButton")
    .addEventListener("click", downloadImage);
});
