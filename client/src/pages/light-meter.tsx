import { LightMeter } from '@/components/tools/LightMeter';

export default function LightMeterPage() {
  return (
    <div className="container px-4 py-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Light Meter</h1>
        <p className="text-muted-foreground">
          Measure light levels in your space to determine the best location for your plants.
        </p>
      </div>
      <LightMeter />
    </div>
  );
}