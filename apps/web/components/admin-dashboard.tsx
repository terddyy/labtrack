"use client";

import { createQrPayload, type Asset } from "@labtrack/shared";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Download, MessageSquare, Package, QrCode, RefreshCw, ScanLine, ShieldCheck, Wrench } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState } from "react";
import { assets, bookings, defectReports, getAssetQrPayload } from "@/lib/sample-data";

const navigation = [
  { label: "Dashboard", icon: ClipboardCheck },
  { label: "Assets", icon: Package },
  { label: "QR Codes", icon: QrCode },
  { label: "Bookings", icon: CheckCircle2 },
  { label: "Defects", icon: Wrench },
  { label: "Tickets", icon: MessageSquare },
  { label: "Access", icon: ShieldCheck }
];

export function AdminDashboard() {
  const [selectedAssetId, setSelectedAssetId] = useState(assets[0].id);
  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) ?? assets[0],
    [selectedAssetId]
  );

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>LABTRACK</strong>
          <span>CCS Asset Operations</span>
        </div>
        <nav className="nav" aria-label="Admin sections">
          {navigation.map((item, index) => {
            const Icon = item.icon;
            return (
              <button className={index === 0 ? "active" : ""} key={item.label} type="button">
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="content">
        <div className="topbar">
          <div>
            <p className="eyebrow">Pampanga State University</p>
            <h1>Hardware asset command center</h1>
            <p className="muted">Manage QR-tagged equipment, instructor bookings, defect reports, and ticket communication.</p>
          </div>
          <div className="actions">
            <button className="button secondary" type="button">
              <RefreshCw size={16} />
              Sync Supabase
            </button>
            <button className="button primary" type="button">
              <QrCode size={16} />
              Generate QR
            </button>
          </div>
        </div>

        <section className="metrics" aria-label="Operational summary">
          <Metric label="Registered assets" value={assets.length.toString()} />
          <Metric label="Pending bookings" value={bookings.filter((booking) => booking.status === "pending").length.toString()} />
          <Metric label="Defect reports" value={defectReports.length.toString()} />
          <Metric label="Active QR codes" value={assets.length.toString()} />
        </section>

        <section className="grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Asset register</h2>
                <p className="muted">Every physical item receives its own QR code and operational history.</p>
              </div>
              <button className="button secondary" type="button">New asset</button>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Property no.</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>QR</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td>
                      <strong>{asset.name}</strong>
                      <p className="muted">{asset.categoryName}</p>
                    </td>
                    <td>{asset.propertyNumber}</td>
                    <td>{asset.locationName}</td>
                    <td><StatusBadge status={asset.status} /></td>
                    <td>
                      <button className="button secondary" onClick={() => setSelectedAssetId(asset.id)} type="button">
                        <ScanLine size={15} />
                        Preview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>QR code label</h2>
                <p className="muted">Admin-generated code for instructor scanning.</p>
              </div>
            </div>
            <div className="panel-body qr-card">
              <QrPreview asset={selectedAsset} />
              <div className="actions">
                <button className="button primary" type="button">
                  <Download size={15} />
                  Download PNG
                </button>
                <button className="button secondary" type="button">
                  <RefreshCw size={15} />
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid" style={{ marginTop: 18 }}>
          <WorkflowPanel title="Booking queue" items={bookings.map((booking) => ({
            id: booking.id,
            title: assets.find((asset) => asset.id === booking.assetId)?.name ?? "Unknown asset",
            detail: booking.purpose,
            status: booking.status
          }))} />
          <WorkflowPanel title="Defect triage" items={defectReports.map((report) => ({
            id: report.id,
            title: report.title,
            detail: report.description,
            status: report.status
          }))} />
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${status}`}>{status.replaceAll("_", " ")}</span>;
}

function QrPreview({ asset }: { asset: Asset }) {
  const payload = getAssetQrPayload(asset);
  const instructorDeepLink = `labtrack://scan/${encodeURIComponent(createQrPayload(asset.activeQrCode))}`;

  return (
    <>
      <div className="qr-frame">
        <QRCodeSVG value={payload} size={190} level="M" includeMargin />
      </div>
      <div className="form-grid">
        <div>
          <h3>{asset.name}</h3>
          <p className="muted">{asset.propertyNumber}</p>
        </div>
        <div className="field">
          <label>QR payload</label>
          <input readOnly value={payload} />
        </div>
        <div className="field">
          <label>Instructor deep link</label>
          <input readOnly value={instructorDeepLink} />
        </div>
      </div>
    </>
  );
}

function WorkflowPanel({ title, items }: { title: string; items: Array<{ id: string; title: string; detail: string; status: string }> }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
      </div>
      <div className="panel-body timeline">
        {items.map((item) => (
          <article className="timeline-item" key={item.id}>
            <div className="topbar" style={{ marginBottom: 8 }}>
              <h3>{item.title}</h3>
              <StatusBadge status={item.status} />
            </div>
            <p className="muted">{item.detail}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
