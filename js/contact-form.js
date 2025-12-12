(() => {
  const form = document.getElementById("contactForm");
  if (!form) return;

  const statusEl = document.getElementById("contactStatus");
  const submitBtn = document.getElementById("contactSubmit");
  const btnText = submitBtn?.querySelector(".btn-text");
  const btnSending = submitBtn?.querySelector(".btn-sending");

  function setStatus(message, type) {
    statusEl.hidden = false;
    statusEl.textContent = message;
    statusEl.classList.remove("is-success", "is-error");
    if (type) statusEl.classList.add(type);
  }

  function setSending(isSending) {
    submitBtn.disabled = isSending;
    if (btnText) btnText.hidden = isSending;
    if (btnSending) btnSending.hidden = !isSending;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Honeypot check
    const hp = form.querySelector('input[name="website"]');
    if (hp && hp.value.trim() !== "") {
      setStatus("Thanks — your message has been sent.", "is-success");
      form.reset();
      return;
    }

    if (!form.checkValidity()) {
      setStatus("Please fill out the required fields.", "is-error");
      return;
    }

    setSending(true);
    statusEl.hidden = true;

    try {
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());

      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("Message sent. I’ll get back to you soon.", "is-success");
        form.reset();
      } else {
        setStatus("Something went wrong. Please try again.", "is-error");
        console.error("Web3Forms error:", data);
      }
    } catch (err) {
      setStatus("Network error. Please try again later.", "is-error");
      console.error(err);
    } finally {
      setSending(false);
    }
  });
})();
