"use client";
import { useState } from "react";
import { Offer } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import {
  getOfferPDFDataUri,
  getOfferPDFFilename,
  downloadOfferPDF,
} from "@/lib/pdf";
import emailjs from "@emailjs/browser";

// ✏️ Fill these from your EmailJS account (emailjs.com → free)
const EMAILJS_SERVICE_ID = "service_6s1w0fq";
const EMAILJS_TEMPLATE_ID = "template_168ue7n";
const EMAILJS_PUBLIC_KEY = "H8zAYlRa9H8WsCieA";

// Convert base64 data URI to a Blob for upload
function dataUriToBlob(dataUri: string): Blob {
  const [header, base64] = dataUri.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "application/pdf";
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new Blob([array], { type: mime });
}

export default function SendQuoteModal({
  offer,
  onClose,
}: {
  offer: Offer;
  onClose: () => void;
}) {
  const filename = getOfferPDFFilename(offer);
  const [to, setTo] = useState(offer.email || "");
  const [subject, setSubject] = useState(
    `Solar Offer #${offer.offer_number} v${offer.version} — ${offer.first_name} ${offer.last_name}`,
  );
  const [body, setBody] = useState(
    `Dear ${offer.salutation} ${offer.last_name},\n\nThank you for your interest. Please find your solar offer #${offer.offer_number} (v${offer.version}) attached below.\n\nTotal Price (excl. VAT): €${offer.total_price.toFixed(2)}\n\n{{PDF_LINK}}\n\nPlease don't hesitate to reach out if you have any questions.\n\nBest regards,\nSolar Team`,
  );
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleDownloadPDF = () => downloadOfferPDF(offer);

  const uploadPDFAndGetUrl = async (): Promise<string> => {
    setUploadProgress("Generating PDF...");
    const dataUri = getOfferPDFDataUri(offer);
    const blob = dataUriToBlob(dataUri);
    const storagePath = `offers/${offer.offer_number}/v${offer.version}/${filename}`;

    setUploadProgress("Uploading PDF...");
    const { error: uploadError } = await supabase.storage
      .from("offer-pdfs")
      .upload(storagePath, blob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data } = supabase.storage
      .from("offer-pdfs")
      .getPublicUrl(storagePath);
    setUploadProgress(null);
    return data.publicUrl;
  };

  const handleSend = async () => {
    if (!to) {
      setError("Please enter a recipient email.");
      return;
    }
    setSending(true);
    setError("");

    try {
      const pdfUrl = await uploadPDFAndGetUrl();

      const finalBody = body.replace(
        "{{PDF_LINK}}",
        `Download your PDF here:\n${pdfUrl}`,
      );

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          to_email: to,
          to_name: `${offer.salutation} ${offer.last_name}`,
          subject,
          message: finalBody,
          offer_number: offer.offer_number,
          offer_version: `v${offer.version}`,
          total_price: `€${offer.total_price.toFixed(2)}`,
          pdf_url: pdfUrl,
          pdf_filename: filename,
        },
        EMAILJS_PUBLIC_KEY,
      );

      setSent(true);
    } catch (err: any) {
      console.error(err);
      if (
        err.message?.includes("Upload failed") ||
        err.message?.includes("Bucket")
      ) {
        setError(
          'PDF upload failed. Make sure the "offer-pdfs" storage bucket exists in Supabase with public access enabled. See setup instructions below.',
        );
      } else {
        setError(
          "Failed to send email. Please check your EmailJS configuration.",
        );
      }
    }

    setSending(false);
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ width: 620 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div className="modal-title" style={{ marginBottom: 0 }}>
            {sent ? "✓ Quote Sent!" : "Send Quote to Client"}
          </div>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {sent ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
              Email sent successfully!
            </div>
            <div
              style={{ color: "var(--gray)", fontSize: 13, marginBottom: 24 }}
            >
              The quote with a real PDF download link was sent to{" "}
              <strong>{to}</strong>.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn btn-secondary" onClick={handleDownloadPDF}>
                <PdfIcon /> Download PDF locally
              </button>
              <button className="btn btn-primary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>
                <div>{error}</div>
                {error.includes("bucket") && (
                  <div style={{ marginTop: 8, fontSize: 11, opacity: 0.8 }}>
                    In Supabase → Storage → Create bucket named{" "}
                    <strong>offer-pdfs</strong> → set to Public.
                  </div>
                )}
              </div>
            )}

            {/* PDF info row */}
            <div
              style={{
                background: "var(--gray-xlight)",
                border: "1.5px solid var(--gray-light)",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <PdfIcon />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {filename}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--gray)" }}>
                    PDF will be uploaded to Supabase and a real download link
                    embedded in the email
                  </div>
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleDownloadPDF}
              >
                <DownloadIcon /> Save locally
              </button>
            </div>

            {/* PDF_LINK hint */}
            <div
              style={{
                background: "rgba(15,92,122,0.06)",
                border: "1px solid rgba(15,92,122,0.2)",
                borderRadius: 6,
                padding: "8px 12px",
                marginBottom: 14,
                fontSize: 12,
                color: "var(--teal)",
              }}
            >
              💡 <strong>{"{{PDF_LINK}}"}</strong> in the body below will be
              replaced with the real PDF download link automatically.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="form-group">
                <label>To (Email)</label>
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="client@example.com"
                  type="email"
                />
              </div>
              <div className="form-group">
                <label>Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Email Body</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  style={{
                    resize: "vertical",
                    fontFamily: "inherit",
                    lineHeight: 1.6,
                  }}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSend}
                disabled={sending}
                style={{ minWidth: 130 }}
              >
                {sending ? (
                  <>
                    <Spinner /> {uploadProgress || "Sending..."}
                  </>
                ) : (
                  <>
                    <SendIcon /> Send Email
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const PdfIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);
const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const SendIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const Spinner = () => (
  <span style={{
    display: "inline-block", width: 12, height: 12,
    border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white",
    borderRadius: "50%", animation: "spin 0.6s linear infinite",
  }} />
);
