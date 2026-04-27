"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase, Product, OfferItem, Offer, SECTIONS } from "@/lib/supabase";
import { useOfferForm } from "@/lib/offerFormStore";
import { downloadOfferPDF } from "@/lib/pdf";
import SendQuoteModal from "@/components/SendQuoteModal";

export default function NewOfferPage() {
  const { form, updateForm, resetForm } = useOfferForm();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  useEffect(() => {
    supabase
      .from("products")
      .select("*")
      .order("section")
      .order("brand_model")
      .then(({ data }) => {
        if (data) setProducts(data);
        setLoading(false);
      });

    // Auto-load default manpower rate if not already set
    if (form.manpowerDailyRate === 0) {
      supabase
        .from("settings")
        .select("value")
        .eq("key", "manpower_daily_rate")
        .single()
        .then(({ data }) => {
          if (data?.value)
            updateForm({ manpowerDailyRate: parseFloat(data.value) || 0 });
        });
    }
  }, []);

  const productsBySection = useCallback(
    (section: string) => products.filter((p) => p.section === section),
    [products],
  );

  const getProduct = (id: string) => products.find((p) => p.id === id);

  const updateRow = (
    section: string,
    rowIdx: number,
    field: "selectedProductId" | "quantity",
    value: string | number,
  ) => {
    const rows = [...form.sectionStates[section]];
    rows[rowIdx] = { ...rows[rowIdx], [field]: value };
    updateForm({ sectionStates: { ...form.sectionStates, [section]: rows } });
  };

  const addRow = (section: string) => {
    const rows = [
      ...form.sectionStates[section],
      { selectedProductId: "", quantity: 0 },
    ];
    updateForm({ sectionStates: { ...form.sectionStates, [section]: rows } });
  };

  const removeRow = (section: string, rowIdx: number) => {
    const rows = form.sectionStates[section].filter((_, i) => i !== rowIdx);
    updateForm({
      sectionStates: {
        ...form.sectionStates,
        [section]: rows.length
          ? rows
          : [{ selectedProductId: "", quantity: 0 }],
      },
    });
  };

  const sectionSubtotal = (section: string) =>
    form.sectionStates[section].reduce((sum, row) => {
      const p = getProduct(row.selectedProductId);
      return sum + (p ? p.price_per_unit * row.quantity : 0);
    }, 0);

  const componentTotal = SECTIONS.reduce(
    (sum, s) => sum + sectionSubtotal(s),
    0,
  );
  const manpowerTotal =
    form.manpowerDays * form.manpowerPeople * form.manpowerDailyRate;
  const mobilizationTotal = form.mobilizationEnabled ? form.mobilizationFee : 0;
  const totalPrice = componentTotal + manpowerTotal + mobilizationTotal;

  const buildOfferItems = (): OfferItem[] => {
    const items: OfferItem[] = [];
    SECTIONS.forEach((section) => {
      form.sectionStates[section].forEach((row) => {
        const p = getProduct(row.selectedProductId);
        if (p && row.quantity > 0)
          items.push({
            product: p,
            quantity: row.quantity,
            subtotal: p.price_per_unit * row.quantity,
          });
      });
    });
    return items;
  };

  const buildOffer = (): Offer => ({
    id: form.editingOfferId || undefined,
    offer_number: form.offerNumber,
    version: form.editingVersion,
    date: form.date,
    ...form.client,
    items: buildOfferItems(),
    manpower: {
      days: form.manpowerDays,
      people: form.manpowerPeople,
      daily_rate: form.manpowerDailyRate,
      subtotal: manpowerTotal,
    },
    mobilization_fee: form.mobilizationFee,
    mobilization_enabled: form.mobilizationEnabled,
    total_price: totalPrice,
  });

  const handleSave = async () => {
    setSaving(true);
    const offer = buildOffer();
    await supabase.from("offers").insert([
      {
        offer_number: offer.offer_number,
        version: offer.version,
        date: offer.date,
        first_name: offer.first_name,
        last_name: offer.last_name,
        salutation: offer.salutation,
        address: offer.address,
        postal_code: offer.postal_code,
        email: offer.email,
        phone: offer.phone,
        items: offer.items,
        manpower: offer.manpower,
        mobilization_fee: offer.mobilization_fee,
        mobilization_enabled: offer.mobilization_enabled,
        total_price: offer.total_price,
      },
    ]);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleExportPDF = () => {
    const items = buildOfferItems();
    if (!items.length && manpowerTotal === 0 && mobilizationTotal === 0) {
      alert("Please add at least one item.");
      return;
    }
    downloadOfferPDF(buildOffer());
  };

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
        }}
      >
        <div style={{ textAlign: "center", color: "var(--gray)" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>☀️</div>
          <div>Loading products...</div>
        </div>
      </div>
    );

  const isEditing = !!form.editingOfferId;

  return (
    <div style={{ maxWidth: 920 }}>
      {/* Header */}
      <div
        className="page-header"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div className="page-title">
            {isEditing
              ? `Editing Offer #${form.offerNumber}`
              : "Create New Offer"}
          </div>
          <div className="page-subtitle">
            Offer No.&nbsp;
            <span
              className="font-mono"
              style={{ color: "var(--green)", fontWeight: 700 }}
            >
              {form.offerNumber}
            </span>
            &nbsp;·&nbsp;
            <span
              style={{
                background: isEditing
                  ? "rgba(230,90,30,0.12)"
                  : "var(--gray-xlight)",
                color: isEditing ? "var(--green)" : "var(--gray)",
                padding: "1px 8px",
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              v{form.editingVersion}
            </span>
            &nbsp;·&nbsp; {form.date}
          </div>
        </div>
        <div
          className="flex gap-2"
          style={{ flexWrap: "wrap", justifyContent: "flex-end" }}
        >
          <button className="btn btn-secondary btn-sm" onClick={resetForm}>
            <ResetIcon /> New Offer
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleSave}
            disabled={saving}
          >
            <SaveIcon />{" "}
            {saving
              ? "Saving..."
              : isEditing
                ? `Save as v${form.editingVersion}`
                : "Save"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleExportPDF}>
            <PdfIcon /> Export PDF
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowSendModal(true)}
          >
            <SendIcon /> Send Quote
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          ✏️ You are editing offer <strong>#{form.offerNumber}</strong>. Saving
          will create version <strong>v{form.editingVersion}</strong>.
        </div>
      )}
      {saved && (
        <div className="alert alert-success">
          ✓ Offer saved as v{form.editingVersion}.
        </div>
      )}

      {/* Client Info */}
      <div className="section-card mb-4">
        <div className="section-header">
          <span className="section-title">Client Information</span>
        </div>
        <div className="section-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Salutation</label>
              <select
                value={form.client.salutation}
                onChange={(e) =>
                  updateForm({
                    client: { ...form.client, salutation: e.target.value },
                  })
                }
              >
                <option>Mr.</option>
                <option>Ms.</option>
                <option>Other</option>
                <option>Company</option>
              </select>
            </div>
            <div className="form-group" />
            <div className="form-group">
              <label>First Name</label>
              <input
                value={form.client.first_name}
                onChange={(e) =>
                  updateForm({
                    client: { ...form.client, first_name: e.target.value },
                  })
                }
                placeholder="First name"
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                value={form.client.last_name}
                onChange={(e) =>
                  updateForm({
                    client: { ...form.client, last_name: e.target.value },
                  })
                }
                placeholder="Last name"
              />
            </div>
            <div className="form-group full">
              <label>Address</label>
              <input
                value={form.client.address}
                onChange={(e) =>
                  updateForm({
                    client: { ...form.client, address: e.target.value },
                  })
                }
                placeholder="Street and house number"
              />
            </div>
            <div className="form-group">
              <label>Postal Code / City</label>
              <input
                value={form.client.postal_code}
                onChange={(e) =>
                  updateForm({
                    client: { ...form.client, postal_code: e.target.value },
                  })
                }
                placeholder="e.g. SK2 7HW"
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={form.client.email}
                onChange={(e) =>
                  updateForm({
                    client: { ...form.client, email: e.target.value },
                  })
                }
                placeholder="email@example.com"
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                value={form.client.phone}
                onChange={(e) =>
                  updateForm({
                    client: { ...form.client, phone: e.target.value },
                  })
                }
                placeholder="+44 ..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Product Sections */}
      {SECTIONS.map((section) => {
        const sectionProducts = productsBySection(section);
        const subtotal = sectionSubtotal(section);
        const rows = form.sectionStates[section];
        return (
          <div key={section} className="section-card mb-4">
            <div className="section-header">
              <span className="section-title">{section}</span>
              <span className="section-subtotal">{subtotal.toFixed(2)} €</span>
            </div>
            <div className="section-body">
              {sectionProducts.length === 0 ? (
                <div
                  style={{
                    color: "var(--gray)",
                    fontSize: 12,
                    fontStyle: "italic",
                    padding: "8px 0",
                  }}
                >
                  No products in this category. Please add some in the Admin
                  panel.
                </div>
              ) : (
                <>
                  {rows.map((row, rowIdx) => {
                    const sel = getProduct(row.selectedProductId);
                    return (
                      <div
                        key={rowIdx}
                        style={{
                          marginBottom: 14,
                          paddingBottom: rowIdx < rows.length - 1 ? 14 : 0,
                          borderBottom:
                            rowIdx < rows.length - 1
                              ? "1px solid var(--gray-light)"
                              : "none",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto auto",
                            gap: 12,
                            alignItems: "end",
                            marginBottom: 8,
                          }}
                        >
                          <div
                            className="form-group"
                            style={{ marginBottom: 0 }}
                          >
                            <label>Brand / Model</label>
                            <select
                              value={row.selectedProductId}
                              onChange={(e) =>
                                updateRow(
                                  section,
                                  rowIdx,
                                  "selectedProductId",
                                  e.target.value,
                                )
                              }
                            >
                              <option value="">— Select a product —</option>
                              {sectionProducts.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.brand_model}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div
                            className="form-group"
                            style={{ marginBottom: 0 }}
                          >
                            <label>Quantity</label>
                            <div className="qty-control">
                              <button
                                className="qty-btn minus"
                                onClick={() =>
                                  updateRow(
                                    section,
                                    rowIdx,
                                    "quantity",
                                    Math.max(0, row.quantity - 1),
                                  )
                                }
                              >
                                −
                              </button>
                              <input
                                className="qty-input"
                                type="number"
                                min={0}
                                value={row.quantity}
                                onChange={(e) =>
                                  updateRow(
                                    section,
                                    rowIdx,
                                    "quantity",
                                    Math.max(0, parseInt(e.target.value) || 0),
                                  )
                                }
                              />
                              <button
                                className="qty-btn plus"
                                onClick={() =>
                                  updateRow(
                                    section,
                                    rowIdx,
                                    "quantity",
                                    row.quantity + 1,
                                  )
                                }
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div style={{ paddingBottom: 2 }}>
                            {rows.length > 1 && (
                              <button
                                className="btn btn-danger btn-sm btn-icon"
                                onClick={() => removeRow(section, rowIdx)}
                              >
                                <TrashIcon />
                              </button>
                            )}
                          </div>
                        </div>
                        {sel && (
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                              alignItems: "center",
                            }}
                          >
                            {sel.capacity && (
                              <span className="info-chip">
                                Capacity: {sel.capacity}
                              </span>
                            )}
                            {sel.colour && (
                              <span className="info-chip">
                                Colour: {sel.colour}
                              </span>
                            )}
                            {sel.garantie && (
                              <span className="info-chip">
                                Warranty: {sel.garantie} yrs.
                              </span>
                            )}
                            {sel.usp && (
                              <span className="usp-text">✦ {sel.usp}</span>
                            )}
                            {row.quantity > 0 && (
                              <span
                                style={{
                                  marginLeft: "auto",
                                  fontFamily: "Space Mono, monospace",
                                  fontWeight: 700,
                                  fontSize: 13,
                                  color: "var(--green)",
                                }}
                              >
                                {(sel.price_per_unit * row.quantity).toFixed(2)}{" "}
                                €
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={() => addRow(section)}
                  >
                    <PlusIcon /> Add another product
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* Manpower Fee */}
      <div className="section-card mb-4">
        <div className="section-header">
          <span className="section-title">Manpower Fee</span>
          <span className="section-subtotal">{manpowerTotal.toFixed(2)} €</span>
        </div>
        <div className="section-body">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
              marginBottom: 12,
            }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Number of Days</label>
              <div className="qty-control">
                <button
                  className="qty-btn minus"
                  onClick={() =>
                    updateForm({
                      manpowerDays: Math.max(0, form.manpowerDays - 1),
                    })
                  }
                >
                  −
                </button>
                <input
                  className="qty-input"
                  type="number"
                  min={0}
                  value={form.manpowerDays}
                  onChange={(e) =>
                    updateForm({
                      manpowerDays: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                />
                <button
                  className="qty-btn plus"
                  onClick={() =>
                    updateForm({ manpowerDays: form.manpowerDays + 1 })
                  }
                >
                  +
                </button>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Number of People</label>
              <div className="qty-control">
                <button
                  className="qty-btn minus"
                  onClick={() =>
                    updateForm({
                      manpowerPeople: Math.max(0, form.manpowerPeople - 1),
                    })
                  }
                >
                  −
                </button>
                <input
                  className="qty-input"
                  type="number"
                  min={0}
                  value={form.manpowerPeople}
                  onChange={(e) =>
                    updateForm({
                      manpowerPeople: Math.max(
                        0,
                        parseInt(e.target.value) || 0,
                      ),
                    })
                  }
                />
                <button
                  className="qty-btn plus"
                  onClick={() =>
                    updateForm({ manpowerPeople: form.manpowerPeople + 1 })
                  }
                >
                  +
                </button>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Daily Rate / Person (€)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.manpowerDailyRate}
                onChange={(e) =>
                  updateForm({
                    manpowerDailyRate: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
              />
            </div>
          </div>
          {form.manpowerDays > 0 &&
            form.manpowerPeople > 0 &&
            form.manpowerDailyRate > 0 && (
              <div
                style={{
                  background: "var(--gray-xlight)",
                  border: "1px solid var(--gray-light)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "var(--gray)",
                }}
              >
                {form.manpowerDays} days × {form.manpowerPeople} people ×{" "}
                {form.manpowerDailyRate.toFixed(2)} €/day =&nbsp;
                <strong
                  style={{
                    color: "var(--green)",
                    fontFamily: "Space Mono, monospace",
                  }}
                >
                  {manpowerTotal.toFixed(2)} €
                </strong>
              </div>
            )}
        </div>
      </div>

      {/* Mobilization Fee */}
      <div className="section-card mb-4">
        <div
          className="section-header"
          style={{ cursor: "pointer" }}
          onClick={() =>
            updateForm({ mobilizationEnabled: !form.mobilizationEnabled })
          }
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                background: form.mobilizationEnabled
                  ? "var(--green)"
                  : "transparent",
                border: `2px solid ${form.mobilizationEnabled ? "var(--green)" : "#6B7280"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {form.mobilizationEnabled && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span className="section-title">
              Mobilization Fee{" "}
              <span style={{ fontWeight: 400, fontSize: 11, opacity: 0.7 }}>
                (optional — click to enable)
              </span>
            </span>
          </div>
          <span className="section-subtotal">
            {form.mobilizationEnabled ? mobilizationTotal.toFixed(2) : "0.00"} €
          </span>
        </div>
        {form.mobilizationEnabled && (
          <div className="section-body">
            <div className="form-group" style={{ maxWidth: 280 }}>
              <label>Mobilization Amount (€)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.mobilizationFee}
                onChange={(e) =>
                  updateForm({
                    mobilizationFee: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
                autoFocus
              />
            </div>
          </div>
        )}
      </div>

      {/* Price Breakdown */}
      <div className="section-card mb-4">
        <div className="section-header">
          <span className="section-title">Price Breakdown</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {[
              { label: "Components", value: componentTotal, show: true },
              {
                label: "Manpower Fee",
                value: manpowerTotal,
                show: manpowerTotal > 0,
              },
              {
                label: "Mobilization Fee",
                value: mobilizationTotal,
                show: form.mobilizationEnabled && mobilizationTotal > 0,
              },
            ]
              .filter((r) => r.show)
              .map((row, i, arr) => (
                <tr
                  key={row.label}
                  style={{ borderBottom: "1px solid var(--gray-light)" }}
                >
                  <td
                    style={{
                      padding: "12px 20px",
                      fontSize: 13,
                      color: "var(--gray)",
                    }}
                  >
                    {row.label}
                  </td>
                  <td
                    style={{
                      padding: "12px 20px",
                      textAlign: "right",
                      fontFamily: "Space Mono, monospace",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {row.value.toFixed(2)} €
                  </td>
                </tr>
              ))}
            <tr style={{ background: "var(--teal)" }}>
              <td
                style={{
                  padding: "14px 20px",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "white",
                }}
              >
                Total Price{" "}
                <span
                  style={{ fontSize: 11, fontWeight: 400, color: "#9CA3AF" }}
                >
                  (excl. VAT)
                </span>
              </td>
              <td
                style={{
                  padding: "14px 20px",
                  textAlign: "right",
                  fontFamily: "Space Mono, monospace",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--green-light)",
                }}
              >
                {totalPrice.toFixed(2)} €
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ height: 40 }} />
      {showSendModal && (
        <SendQuoteModal
          offer={buildOffer()}
          onClose={() => setShowSendModal(false)}
        />
      )}
    </div>
  );
}

const ResetIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 .49-4" />
  </svg>
);
const SaveIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);
const PdfIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);
const SendIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const PlusIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const TrashIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
