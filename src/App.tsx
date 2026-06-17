import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout";
import { Home } from "@/pages/home";
import { DocPage } from "@/pages/doc-page";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        {/* Todas as rotas de área/grupo/item caem na DocPage,
            que resolve o conteúdo pela URL. */}
        <Route path="*" element={<DocPage />} />
      </Route>
    </Routes>
  );
}
