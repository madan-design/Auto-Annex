import { useState } from "react";
import { api } from "../services/api";

const Augment = () => {

  const [source, setSource] = useState<File | null>(null);
  const [masks, setMasks] = useState<File[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAugment = async () => {
    try {
      if (!source) {
        alert("Select source image");
        return;
      }

      if (!masks.length) {
        alert("Select mask files");
        return;
      }

      console.log("STARTING AUGMENTATION...");

      setLoading(true);

      const res = await api.augmentDataset(
        source,
        masks,
        quantity
      );

      console.log("RESULT:", res);

      setResult(res);

    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>Dataset Augmentation</h2>

      {/* SOURCE IMAGE */}
      <div>
        <p>Source Image:</p>
        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            setSource(e.target.files?.[0] || null)
          }
        />
      </div>

      <br />

      {/* MASKS */}
      <div>
        <p>Mask Files:</p>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) =>
            setMasks(Array.from(e.target.files || []))
          }
        />
      </div>

      <br />

      {/* QUANTITY */}
      <div>
        <p>Quantity:</p>
        <input
          type="number"
          value={quantity}
          onChange={(e) =>
            setQuantity(Number(e.target.value))
          }
        />
      </div>

      <br />

      {/* BUTTON */}
      <button onClick={handleAugment} disabled={loading}>
        {loading ? "Augmenting..." : "Start Augmentation"}
      </button>

      <br /><br />

      {/* RESULT */}
      {result && (
        <div>
          <h3>Done ✅</h3>
          <p>Total: {result.count}</p>
        </div>
      )}
    </div>
  );
};

export default Augment;