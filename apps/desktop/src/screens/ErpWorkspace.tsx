import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Webview } from "@tauri-apps/api/webview";

export function ErpWorkspace() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let view: Webview | null = null;

    async function openWorkspace() {
      try {
        const parent = getCurrentWindow();
        const existing = await Webview.getByLabel("erpnext-workspace");

        if (existing) {
          view = existing;
          await view.setAutoResize(true);
          return;
        }

        view = new Webview(parent, "erpnext-workspace", {
          url: "https://erp.hawkaerosystem.com/login",
          x: 0,
          y: 40,
          width: 1040,
          height: 680,
          focus: true
        });

        await new Promise<void>((resolve, reject) => {
          if (!view) {
            reject(new Error("ERPNext webview could not be created."));
            return;
          }

          view.once("tauri://created", () => resolve());
          view.once("tauri://error", (event) => reject(event));
        });

        if (active && view) {
          await view.setAutoResize(true);
        }
      } catch (e: unknown) {
        console.error("ERPNext WebView error:", e);
        if (active) {
          const details =
            e instanceof Error
              ? e.message
              : typeof e === "string"
                ? e
                : JSON.stringify(e, Object.getOwnPropertyNames(e ?? {}), 2);
          setError(details || "Unknown error while opening ERPNext.");
        }
      }
    }

    void openWorkspace();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: "#fff" }}>
      <div
        onMouseDown={() => { void getCurrentWindow().startDragging(); }}
        style={{
          height: 40,
          flex: "0 0 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#242731",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          userSelect: "none"
        }}
      >
        ERPNext â€” BiBoTracking
      </div>
      {error && (
        <div role="alert" style={{ padding: 16, color: "#b42318" }}>
          Could not open ERPNext: {error}
        </div>
      )}
    </div>
  );
}

