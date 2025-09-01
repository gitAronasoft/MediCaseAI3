import { useParams, useLocation } from "wouter";
import Layout from "@/components/Layout";
import { DocumentReview } from "@/components/DocumentReview";

export default function DocumentAnalysisPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const documentId = params.documentId;

  if (!documentId) {
    navigate("/documents");
    return <div>Redirecting...</div>;
  }

  return (
    <Layout>
      <DocumentReview
        documentId={documentId}
        onClose={() => navigate("/documents")}
      />
    </Layout>
  );
}