"use client";

import { useState, useCallback } from "react";

interface Props {
  data: unknown;
  name?: string | number | null;
  depth?: number;
  defaultOpen?: boolean;
  maxOpenDepth?: number;
}

export function JsonTree({ data, name = null, depth = 0, defaultOpen, maxOpenDepth }: Props) {
  const startOpen = maxOpenDepth !== undefined ? depth <= maxOpenDepth : (defaultOpen ?? depth < 2);
  const [open, setOpen] = useState(startOpen);
  const [expanded, setExpanded] = useState(false); // for long strings
  const indent = depth * 0.75;

  const keyLabel = name !== null ? (
    <span className="text-json-key font-semibold">{String(name)}</span>
  ) : null;

  const toggle = useCallback(() => setOpen((o) => !o), []);

  // Null
  if (data === null || data === undefined) {
    return (
      <div className="jt-line whitespace-pre-wrap break-words" style={{ paddingLeft: `${indent}rem` }}>
        {keyLabel}{keyLabel && ": "}<span className="text-json-null italic">null</span>
      </div>
    );
  }

  // Boolean
  if (typeof data === "boolean") {
    return (
      <div className="jt-line whitespace-pre-wrap break-words" style={{ paddingLeft: `${indent}rem` }}>
        {keyLabel}{keyLabel && ": "}<span className="text-json-bool font-semibold">{String(data)}</span>
      </div>
    );
  }

  // Number
  if (typeof data === "number") {
    return (
      <div className="jt-line whitespace-pre-wrap break-words" style={{ paddingLeft: `${indent}rem` }}>
        {keyLabel}{keyLabel && ": "}<span className="text-json-number">{data}</span>
      </div>
    );
  }

  // String
  if (typeof data === "string") {
    const truncated = data.length > 200 && !expanded;
    return (
      <div className="jt-line whitespace-pre-wrap break-words" style={{ paddingLeft: `${indent}rem` }}>
        {keyLabel}{keyLabel && ": "}
        <span className="text-json-string">
          &quot;{truncated ? data.slice(0, 120) : data}&quot;
        </span>
        {truncated && (
          <button
            className="text-brand text-xs ml-1 hover:underline"
            onClick={() => setExpanded(true)}
          >
            &hellip;{data.length} chars
          </button>
        )}
      </div>
    );
  }

  // Array
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <div className="jt-line" style={{ paddingLeft: `${indent}rem` }}>
          {keyLabel}{keyLabel && ": "}<span className="text-foreground/70 font-bold">[]</span>
        </div>
      );
    }

    return (
      <div className={`jt-node${open ? " open" : ""}`} style={{ paddingLeft: `${indent}rem` }}>
        <span className="jt-toggle cursor-pointer select-none" onClick={toggle}>
          <span className="text-muted text-xs mr-1">{open ? "▾" : "▸"}</span>
          {keyLabel}{keyLabel && ": "}
          <span className="text-foreground/70 font-bold">[</span>
          {!open && <span className="text-xs text-muted italic ml-1">{data.length} items</span>}
        </span>
        {open && (
          <>
            <div className="jt-children">
              {data.map((item, i) => (
                <JsonTree key={i} data={item} name={i} depth={depth + 1} defaultOpen={depth + 1 < 1} maxOpenDepth={maxOpenDepth} />
              ))}
            </div>
            <div style={{ paddingLeft: `${indent}rem` }}>
              <span className="text-foreground/70 font-bold">]</span>
            </div>
          </>
        )}
      </div>
    );
  }

  // Object
  if (typeof data === "object") {
    const keys = Object.keys(data as Record<string, unknown>);
    if (keys.length === 0) {
      return (
        <div className="jt-line" style={{ paddingLeft: `${indent}rem` }}>
          {keyLabel}{keyLabel && ": "}<span className="text-foreground/70 font-bold">{"{}"}</span>
        </div>
      );
    }

    return (
      <div className={`jt-node${open ? " open" : ""}`} style={{ paddingLeft: `${indent}rem` }}>
        <span className="jt-toggle cursor-pointer select-none" onClick={toggle}>
          <span className="text-muted text-xs mr-1">{open ? "▾" : "▸"}</span>
          {keyLabel}{keyLabel && ": "}
          <span className="text-foreground/70 font-bold">{"{"}</span>
          {!open && <span className="text-xs text-muted italic ml-1">{keys.length} keys</span>}
        </span>
        {open && (
          <>
            <div className="jt-children">
              {keys.map((k) => (
                <JsonTree key={k} data={(data as Record<string, unknown>)[k]} name={k} depth={depth + 1} defaultOpen={depth + 1 < 1} maxOpenDepth={maxOpenDepth} />
              ))}
            </div>
            <div style={{ paddingLeft: `${indent}rem` }}>
              <span className="text-foreground/70 font-bold">{"}"}</span>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="jt-line" style={{ paddingLeft: `${indent}rem` }}>
      {keyLabel}{keyLabel && ": "}{String(data)}
    </div>
  );
}
