import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

export default (() => {
  const SyncBar: QuartzComponent = (_props: QuartzComponentProps) => {
    return (
      <div id="sync-bar" class="sync-bar">
        <span class="sync-status" id="sync-status">
          Checking sync status...
        </span>
        <button class="sync-button" id="sync-button" disabled>
          Sync
        </button>
      </div>
    )
  }

  SyncBar.css = `
    .sync-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background: var(--lightgray);
      border-top: 1px solid var(--gray);
      z-index: 100;
      font-size: 0.85rem;
    }
    .sync-status { color: var(--darkgray); }
    .sync-button {
      padding: 4px 16px;
      border: 1px solid var(--secondary);
      background: var(--secondary);
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
    }
    .sync-button:disabled { opacity: 0.5; cursor: not-allowed; }
    .sync-button:hover:not(:disabled) { opacity: 0.85; }
    .sync-toast {
      position: fixed;
      bottom: 50px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--dark);
      color: var(--light);
      padding: 12px 20px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 101;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .sync-toast button {
      padding: 4px 12px;
      border: 1px solid var(--tertiary);
      background: var(--tertiary);
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
    }
    .sync-toast .toast-close {
      background: none;
      border: none;
      color: var(--lightgray);
      cursor: pointer;
      font-size: 1.1rem;
      padding: 0 4px;
    }
    body { padding-bottom: 40px; }
  `

  SyncBar.afterDOMLoaded = `
    (function() {
      var statusEl = document.getElementById("sync-status");
      var buttonEl = document.getElementById("sync-button");
      if (!statusEl || !buttonEl) return;

      function timeAgo(isoString) {
        if (!isoString) return "never";
        var seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
        if (seconds < 60) return seconds + "s ago";
        if (seconds < 3600) return Math.floor(seconds / 60) + "min ago";
        if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
        return Math.floor(seconds / 86400) + "d ago";
      }

      function updateStatus() {
        fetch("/api/status")
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (data.lastSyncTime) {
              var successText = data.success ? "✓" : "✗";
              statusEl.textContent = successText + " Last synced: " + timeAgo(data.lastSyncTime);
            } else {
              statusEl.textContent = "Not synced yet";
            }
            buttonEl.disabled = false;
            if (data.needsSync && !document.getElementById("sync-toast")) {
              showStaleToast();
            }
          })
          .catch(function() {
            statusEl.textContent = "Cannot reach server";
            buttonEl.disabled = true;
          });
      }

      function showStaleToast() {
        var toast = document.createElement("div");
        toast.className = "sync-toast";
        toast.id = "sync-toast";
        toast.innerHTML = '<span>Wiki content has changed since last sync.</span>' +
          '<button id="toast-sync-btn">Sync now</button>' +
          '<button class="toast-close" id="toast-close-btn">✕</button>';
        document.body.appendChild(toast);
        document.getElementById("toast-sync-btn").addEventListener("click", doSync);
        document.getElementById("toast-close-btn").addEventListener("click", function() { toast.remove(); });
      }

      function doSync() {
        var toast = document.getElementById("sync-toast");
        if (toast) toast.remove();
        statusEl.textContent = "Syncing...";
        buttonEl.disabled = true;
        buttonEl.textContent = "Syncing...";
        fetch("/api/sync", { method: "POST" })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            buttonEl.textContent = "Sync";
            updateStatus();
            if (data.success) { window.location.reload(); }
          })
          .catch(function() {
            statusEl.textContent = "Sync failed";
            buttonEl.disabled = false;
            buttonEl.textContent = "Sync";
          });
      }

      buttonEl.addEventListener("click", doSync);
      updateStatus();
      setInterval(updateStatus, 30000);
    })();
  `

  return SyncBar
}) satisfies QuartzComponentConstructor
