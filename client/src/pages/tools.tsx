import { MainLayout } from '@/components/layouts/MainLayout';
import { Card } from '@/components/ui/card';
import { Link } from 'wouter';
import { SunIcon, CameraIcon } from '@/lib/icons';

export default function Tools() {
  const tools = [
    {
      title: 'Light Meter',
      description: 'Measure light levels using your device camera',
      path: '/tools/light-meter',
      icon: <SunIcon className="w-10 h-10 text-yellow-500" />,
      color: 'bg-yellow-100'
    },
    // More tools can be added here in the future
  ];

  return (
    <MainLayout>
      <div className="p-4">
        <h1 className="text-2xl font-medium mb-2">Garden Tools</h1>
        <p className="text-sm text-neutral-dark opacity-70 mb-6">
          Specialized tools to help with your gardening tasks
        </p>

        <div className="grid gap-4">
          {tools.map((tool, index) => (
            <div key={index} className="w-full">
              <Link href={tool.path}>
                <Card className="p-4 flex items-center cursor-pointer shadow-sm hover:shadow-md transition-shadow">
                  <div className={`${tool.color} p-3 rounded-full mr-4`}>
                    {tool.icon}
                  </div>
                  <div>
                    <h3 className="font-medium">{tool.title}</h3>
                    <p className="text-sm text-neutral-dark opacity-70">{tool.description}</p>
                  </div>
                </Card>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}