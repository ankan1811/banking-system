import HeaderBox from '@/components/HeaderBox';
import StatementUpload from '@/components/StatementUpload';

export default function UploadStatementPage() {
  return (
    <section className="home">
      <div className="home-content">
        <HeaderBox
          title="Upload Bank Statement"
          subtext="Import transactions from your Indian bank account by uploading a CSV statement."
        />
        <StatementUpload />
      </div>
    </section>
  );
}
