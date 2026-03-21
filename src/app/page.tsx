"use client";

import Image from "next/image";
import { useState, useRef, DragEvent, ChangeEvent, FormEvent } from "react";

interface FormState {
  name: string;
  email: string;
  phone: string;
  position: string;
  experience: string;
}

const POSITIONS = [
  "No preference",
  "Product Manager",
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Engineer",
  "Data Analyst",
  "UI/UX Designer",
  "Operations Specialist",
  "Marketing",
  "Human Resources",
  "Finance & Accounting",
  "Other",
];

const EXPERIENCE_OPTIONS = [
  "Fresh Graduate",
  "Less than 1 year",
  "1–3 years",
  "3–5 years",
  "5–10 years",
  "10+ years",
];

export default function SubmitCVPage() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    position: "No preference",
    experience: "1–3 years",
  });
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFieldChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const acceptFile = (candidate: File) => {
    const accepted = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!accepted.includes(candidate.type)) {
      setResult({
        type: "error",
        message: "Only PDF or Word files are supported (.pdf / .doc / .docx).",
      });
      return;
    }
    if (candidate.size > 10 * 1024 * 1024) {
      setResult({ type: "error", message: "File size must not exceed 10 MB." });
      return;
    }
    setResult(null);
    setFile(candidate);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) acceptFile(e.target.files[0]);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.[0]) acceptFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setResult({ type: "error", message: "Please upload your CV file." });
      return;
    }
    setSubmitting(true);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("email", form.email);
      fd.append("phone", form.phone);
      fd.append("position", form.position);
      fd.append("experience", form.experience);
      fd.append("cv", file);

      const res = await fetch("/api/submit-cv", { method: "POST", body: fd });

      // Parse JSON safely — a non-JSON response (e.g. HTML error page) should
      // surface as a readable error rather than a confusing "network error".
      let data: { success?: boolean; error?: string; message?: string };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        throw new Error(
          `Unexpected server response (HTTP ${res.status}). Please try again.`
        );
      }

      if (res.ok && data.success) {
        setResult({
          type: "success",
          message: data.message ?? "Submitted successfully!",
        });
        setForm({
          name: "",
          email: "",
          phone: "",
          position: "No preference",
          experience: "1–3 years",
        });
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setResult({
          type: "error",
          message: data.error ?? "Submission failed. Please try again later.",
        });
      }
    } catch (err) {
      setResult({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Network error. Please check your connection and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-[#e4e7f0]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Image
              src="/directhr-logo.png"
              alt="DirectHR logo"
              width={120}
              height={40}
              className="object-contain"
              priority
            />
          </div>
          <span className="hidden sm:block text-[#e4e7f0] mx-2">|</span>
          <span className="hidden sm:block text-[#636363] text-sm">
            Connecting exceptional talent with great companies
          </span>
        </div>
      </header>

      {/* Hero */}
      <section
        className="text-white py-12 px-4"
        style={{
          background: "linear-gradient(135deg, #263f88 0%, #b11d76 100%)",
        }}
      >
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Submit Your CV</h1>
          <p className="text-blue-100 text-base sm:text-lg leading-relaxed">
            Upload your CV and let our AI system match you with the best
            opportunities
          </p>
        </div>
      </section>

      {/* Main form */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-2xl shadow-md border border-[#e4e7f0] p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-[#1a1a2e] mb-6 pb-4 border-b border-[#e4e7f0]">
            Personal Information
          </h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={form.name}
                onChange={handleFieldChange}
                placeholder="Enter your full name"
                className="form-input w-full px-4 py-2.5 border border-[#e4e7f0] rounded-lg text-sm text-gray-900 placeholder-gray-400 transition-shadow"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleFieldChange}
                placeholder="example@company.com"
                className="form-input w-full px-4 py-2.5 border border-[#e4e7f0] rounded-lg text-sm text-gray-900 placeholder-gray-400 transition-shadow"
              />
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={handleFieldChange}
                placeholder="+1 555 000 0000"
                className="form-input w-full px-4 py-2.5 border border-[#e4e7f0] rounded-lg text-sm text-gray-900 placeholder-gray-400 transition-shadow"
              />
            </div>

            {/* Position + Experience */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="position"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Desired Position
                </label>
                <select
                  id="position"
                  name="position"
                  value={form.position}
                  onChange={handleFieldChange}
                  className="form-input w-full px-4 py-2.5 border border-[#e4e7f0] rounded-lg text-sm text-gray-900 bg-white transition-shadow"
                >
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="experience"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Years of Experience
                </label>
                <select
                  id="experience"
                  name="experience"
                  value={form.experience}
                  onChange={handleFieldChange}
                  className="form-input w-full px-4 py-2.5 border border-[#e4e7f0] rounded-lg text-sm text-gray-900 bg-white transition-shadow"
                >
                  {EXPERIENCE_OPTIONS.map((ex) => (
                    <option key={ex} value={ex}>
                      {ex}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* File upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload CV <span className="text-red-500">*</span>
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    fileInputRef.current?.click();
                }}
                aria-label="Upload CV file area — click or drag and drop"
                className={`upload-zone border-2 border-dashed rounded-xl p-8 text-center cursor-pointer ${
                  dragging
                    ? "border-[#263f88] bg-[#eaecf5]"
                    : file
                    ? "border-green-400 bg-green-50"
                    : "border-[#e4e7f0] bg-[#f7f8fc]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  className="sr-only"
                  aria-hidden="true"
                />

                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      className="w-10 h-10 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-sm font-medium text-green-700">
                      {file.name}
                    </p>
                    <p className="text-xs text-[#636363]">
                      {(file.size / 1024 / 1024).toFixed(2)} MB · Click to
                      replace
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      className="w-10 h-10 text-[#636363]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-[#263f88]">
                        Click to upload
                      </span>{" "}
                      or drag and drop your file here
                    </p>
                    <p className="text-xs text-[#636363]">
                      PDF / DOC / DOCX — max 10 MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Result alert */}
            {result && (
              <div
                role="alert"
                className={`flex items-start gap-3 rounded-lg px-4 py-3 text-sm ${
                  result.type === "success"
                    ? "bg-green-50 border border-green-200 text-green-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}
              >
                {result.type === "success" ? (
                  <svg
                    className="w-5 h-5 text-green-500 shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
                <span>{result.message}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Submitting…
                </span>
              ) : (
                "Submit CV"
              )}
            </button>

            <p className="text-xs text-[#636363] text-center leading-relaxed">
              By submitting you agree to allow us to use your CV for recruitment
              matching purposes.
              <br />
              We are committed to protecting your personal information.
            </p>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#e4e7f0] py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-[#636363]">
            © {new Date().getFullYear()} DirectHR · Connecting exceptional
            talent with great companies
          </p>
        </div>
      </footer>
    </div>
  );
}
