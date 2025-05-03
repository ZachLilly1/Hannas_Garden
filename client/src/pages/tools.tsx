import { Card } from '@/components/ui/card';
import { Link } from 'wouter';
import { 
  AlertTriangle, 
  Calendar, 
  BookOpen, 
  PanelTop, 
  CloudSun, 
  Search, 
  BarChart, 
  Users, 
  Brain,
  Mail
} from 'lucide-react';
import { SunIcon, CameraIcon, LeafIcon, HeartPulseIcon } from '@/lib/icons';

export default function Tools() {
  // Define the Tool interface for better typing
  interface Tool {
    title: string;
    description: string;
    path: string;
    icon: React.ReactNode;
    color: string;
    isAI?: boolean;
  }
  
  const basicTools: Tool[] = [
    {
      title: 'Plant Identifier',
      description: 'Identify plants and get care recommendations',
      path: '/tools/plant-identifier',
      icon: <LeafIcon className="w-10 h-10 text-green-500" />,
      color: 'bg-green-100'
    },
  ];
  
  // AI tools are currently hidden
  const aiTools: Tool[] = [];
  
  return (
    <div className="p-4">
      <div className="mb-6">
        <p className="text-muted-foreground">
          Specialized tools to help with your gardening tasks
        </p>
      </div>

      {/* Basic Tools Section */}
      <div className="mb-8">
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {basicTools.map((tool, index) => (
            <div key={index} className="w-full">
              <Link href={tool.path}>
                <Card className="p-4 h-full flex items-center cursor-pointer shadow-sm hover:shadow-md transition-shadow">
                  <div className={`${tool.color} p-3 rounded-full mr-4 flex-shrink-0`}>
                    {tool.icon}
                  </div>
                  <div>
                    <h3 className="font-medium">{tool.title}</h3>
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                  </div>
                </Card>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* AI Tools Section - hidden for now */}
      {aiTools.length > 0 && (
        <div>
          <div className="flex items-center mb-4">
            <div className="text-neutral-800 dark:text-gray-300 font-medium">AI-Powered Features</div>
            <div className="ml-2 px-2 py-1 bg-purple-100 rounded-full text-xs font-semibold text-purple-800">
              NEW
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {aiTools.map((tool, index) => (
              <div key={index} className="w-full">
                <Link href={tool.path}>
                  <Card className="p-4 h-full flex items-center cursor-pointer shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-purple-300">
                    <div className={`${tool.color} p-3 rounded-full mr-4 flex-shrink-0`}>
                      {tool.icon}
                    </div>
                    <div>
                      <div className="flex items-center">
                        <h3 className="font-medium">{tool.title}</h3>
                        <Brain className="h-3 w-3 ml-1 text-purple-500" />
                      </div>
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
                    </div>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}