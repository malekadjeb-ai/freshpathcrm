import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="text-7xl font-bold text-emerald-600 mb-4">404</div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Page Not Found</h1>
        <p className="text-slate-500 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
