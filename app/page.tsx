import TranslationApp from "./components/TranslationApp";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
      <header className="w-full max-w-4xl mx-auto text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
          智能翻译平台
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          专业多语言翻译服务 | 高精度 | 高效率 | 智能校对 | 质量评估
        </p>
      </header>

      <TranslationApp />

      <footer className="mt-12 text-center text-gray-500 dark:text-gray-400 text-sm">
        <div className="mb-4 flex justify-center space-x-6">
          <a href="#" className="hover:text-blue-500 transition-colors">
            关于我们
          </a>
          <a href="#" className="hover:text-blue-500 transition-colors">
            联系客服
          </a>
          <a href="#" className="hover:text-blue-500 transition-colors">
            API接口
          </a>
          <a href="#" className="hover:text-blue-500 transition-colors">
            企业解决方案
          </a>
        </div>
        <p>
          © {new Date().getFullYear()} 智能翻译 - 专业多语言翻译平台 |{" "}
          <a href="#" className="hover:text-blue-500 transition-colors">
            隐私政策
          </a>{" "}
          |{" "}
          <a href="#" className="hover:text-blue-500 transition-colors">
            使用条款
          </a>
        </p>
      </footer>
    </div>
  );
}
