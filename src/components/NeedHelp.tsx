"use client";

import { useState } from "react";

export default function NeedHelp() {
  const [open, setOpen] = useState(false);
  return (
    <div className="needhelp">
      {open && (
        <div className="needhelp-pop">
          Need help? Text{" "}
          <a href="sms:+19179940722">917-994-0722</a> for instant help.
        </div>
      )}
      <button className="needhelp-btn" onClick={() => setOpen((o) => !o)}>
        💬 Need help?
      </button>
    </div>
  );
}
