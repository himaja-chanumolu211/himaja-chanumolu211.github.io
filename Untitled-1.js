<script type="text/javascript">
(function () {
    const STORAGE_KEY = "embeddedMessagingInputMode"; // "bot" | "agent" | "ended"

    function deepFind(selector, root) {
        for (const el of root.querySelectorAll("*")) {
            if (el.matches(selector)) return el;
            if (el.shadowRoot) {
                const found = deepFind(selector, el.shadowRoot);
                if (found) return found;
            }
        }
        return null;
    }

    function getMode() {
        return localStorage.getItem(STORAGE_KEY) || "bot";
    }

    function setMode(mode) {
        localStorage.setItem(STORAGE_KEY, mode);
        applyState();
    }

    function applyState() {
        const iframe = window.embeddedservice_bootstrap &&
            window.embeddedservice_bootstrap.utilAPI &&
            window.embeddedservice_bootstrap.utilAPI.getEmbeddedMessagingFrame();
        const doc = iframe && iframe.contentDocument;
        if (!doc) return;

        const textarea = deepFind(".embeddedMessagingInputFooterTextArea", doc);
        if (!textarea) return;

        const disabled = getMode() === "bot";
        textarea.disabled = disabled;
        textarea.setAttribute("aria-disabled", disabled ? "true" : "false");
    }

    setInterval(applyState, 500);

    window.addEventListener("storage", (e) => {
        if (e.key === STORAGE_KEY) applyState();
    });

    window.addEventListener("onEmbeddedMessagingConversationStarted", () => {
        setMode("bot");
    });

    window.addEventListener("onEmbeddedMessagingConversationParticipantChanged", (event) => {
        try {
            const payload = JSON.parse(event.detail.conversationEntry.entryPayload);
            const entry = payload.entries[0];
            const role = entry.participant.role;

            if (role === "Agent") {
                setMode(entry.operation === "add" ? "agent" : "ended");
            } else if (role === "Chatbot") {
                setMode(entry.operation === "add" ? "bot" : "ended");
            }
        } catch (e) {
            console.error("Participant changed parse error:", e);
        }
    });

    // Any session end -> enable, so user can type to restart.
    // sessionEndedByRole is NOT reliable (same bot action gave both
    // "Chatbot" and "EndUser" across tests) -> ignore that field here.
    window.addEventListener("onEmbeddedMessagingSessionStatusUpdate", (event) => {
        try {
            const payload = JSON.parse(event.detail.conversationEntry.entryPayload);
            if (payload.sessionStatus === "Ended") {
                setMode("ended");
            }
        } catch (e) {
            console.error("Session status parse error:", e);
        }
    });

    // The one reliable "user deliberately ended it" signal.
    window.addEventListener("onEmbeddedMessagingConversationClosed", () => {
        setMode("bot");
    });
})();
</script>