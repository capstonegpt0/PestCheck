import { useState } from "react";
import api from "../services/api";
import Loader from "./Loader";
import ResultCard from "./ResultCard";

export default function ImageUpload() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select an image");

    const formData = new FormData();
    formData.append("image", file);

    setLoading(true);
    setResult(null);

    try {
      const response = await api.post("/detect/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(response.data);
    } catch (error) {
      alert("Detection failed. Backend not connected yet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <button type="submit">Detect Pest</button>
      </form>

      {loading && <Loader />}
      {result && <ResultCard result={result} />}
    </div>
  );
}
