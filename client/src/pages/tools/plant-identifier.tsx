import { PlantIdentifier } from '@/components/tools/PlantIdentifier';

export default function PlantIdentifierPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Plant Identifier</h1>
      <PlantIdentifier />
    </div>
  );
}