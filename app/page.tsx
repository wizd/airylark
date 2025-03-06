import TranslationApp from "./components/TranslationApp";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
      <TranslationApp />
      <footer className="mt-12 text-center text-gray-500 dark:text-gray-400 text-sm">
        <p>© {new Date().getFullYear()} 智能翻译 | 隐私政策 | 使用条款</p>
      </footer>
    </div>
  );
}
