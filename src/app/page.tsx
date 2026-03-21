"use client";

import { useState, useRef, DragEvent, ChangeEvent, FormEvent } from "react";

interface FormState {
  name: string;
  email: string;
  phone: string;
  position: string;
  experience: string;
}

const POSITIONS = [
  "不限",
  "产品经理",
  "前端工程师",
  "后端工程师",
  "全栈工程师",
  "数据分析师",
  "UI/UX 设计师",
  "运营专员",
  "市场营销",
  "人力资源",
  "财务会计",
  "其他",
];

const EXPERIENCE_OPTIONS = [
  "应届生",
  "1年以下",
  "1-3年",
  "3-5年",
  "5-10年",
  "10年以上",
];

export default function SubmitCVPage() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    position: "不限",
    experience: "1-3年",
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
        message: "只支持 PDF 或 Word 格式（.pdf / .doc / .docx）。",
      });
      return;
    }
    if (candidate.size > 10 * 1024 * 1024) {
      setResult({ type: "error", message: "文件大小不得超过 10 MB。" });
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
      setResult({ type: "error", message: "请上传您的简历文件。" });
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
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
      };

      if (res.ok && data.success) {
        setResult({ type: "success", message: data.message ?? "提交成功！" });
        setForm({
          name: "",
          email: "",
          phone: "",
          position: "不限",
          experience: "1-3年",
        });
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setResult({
          type: "error",
          message: data.error ?? "提交失败，请稍后重试。",
        });
      }
    } catch {
      setResult({ type: "error", message: "网络错误，请检查连接后重试。" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
              D
            </div>
            <span className="text-xl font-semibold text-gray-900">DirectHR</span>
          </div>
          <span className="hidden sm:block text-gray-300 mx-2">|</span>
          <span className="hidden sm:block text-gray-500 text-sm">
            高效对接优秀人才与企业
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-cyan-500 text-white py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">提交您的简历</h1>
          <p className="text-blue-100 text-base sm:text-lg leading-relaxed">
            上传简历，我们的 AI 系统将为您匹配最适合的职位机会
          </p>
        </div>
      </section>

      {/* Main form */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6 pb-4 border-b border-gray-100">
            个人信息
          </h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                姓名 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={form.name}
                onChange={handleFieldChange}
                placeholder="请输入您的姓名"
                className="form-input w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 transition-shadow"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                电子邮箱 <span className="text-red-500">*</span>
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
                className="form-input w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 transition-shadow"
              />
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                联系电话
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={handleFieldChange}
                placeholder="138 0000 0000"
                className="form-input w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 transition-shadow"
              />
            </div>

            {/* Position + Experience */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="position"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  意向职位
                </label>
                <select
                  id="position"
                  name="position"
                  value={form.position}
                  onChange={handleFieldChange}
                  className="form-input w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white transition-shadow"
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
                  工作年限
                </label>
                <select
                  id="experience"
                  name="experience"
                  value={form.experience}
                  onChange={handleFieldChange}
                  className="form-input w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white transition-shadow"
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
                上传简历 <span className="text-red-500">*</span>
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
                aria-label="上传简历文件区域，点击或拖拽文件"
                className={`upload-zone border-2 border-dashed rounded-xl p-8 text-center cursor-pointer ${
                  dragging
                    ? "border-blue-500 bg-blue-50"
                    : file
                    ? "border-green-400 bg-green-50"
                    : "border-gray-300 bg-gray-50"
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
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB · 点击更换文件
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      className="w-10 h-10 text-gray-400"
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
                      <span className="font-medium text-blue-600">点击上传</span>{" "}
                      或拖拽文件至此处
                    </p>
                    <p className="text-xs text-gray-400">
                      支持 PDF / DOC / DOCX，最大 10 MB
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
                  正在提交…
                </span>
              ) : (
                "提交简历"
              )}
            </button>

            <p className="text-xs text-gray-400 text-center leading-relaxed">
              提交即表示您同意我们将您的简历信息用于招聘匹配目的。
              <br />
              我们承诺保护您的个人信息安全。
            </p>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} DirectHR · 高效对接优秀人才与企业
          </p>
        </div>
      </footer>
    </div>
  );
}
