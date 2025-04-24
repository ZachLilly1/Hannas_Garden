import { MainLayout } from '@/components/layouts/MainLayout';
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
  const basicTools = [
    {
      title: 'Light Meter',
      description: 'Measure light levels using your device camera',
      path: '/tools/light-meter',
      icon: <SunIcon className="w-10 h-10 text-yellow-500" />,
      color: 'bg-yellow-100'
    },
    {
      title: 'Plant Identifier',
      description: 'Identify plants and get care recommendations',
      path: '/tools/plant-identifier',
      icon: <LeafIcon className="w-10 h-10 text-green-500" />,
      color: 'bg-green-100'
    },
    {
      title: 'Plant Health Diagnostic',
      description: 'Diagnose plant issues and get treatment recommendations',
      path: '/tools/plant-health-diagnostic',
      icon: <HeartPulseIcon className="w-10 h-10 text-rose-500" />,
      color: 'bg-rose-100'
    },
  ];
  
  const aiTools = [
    {
      title: 'Personalized Plant Advisor',
      description: 'Get customized care recommendations for your specific plants',
      path: '/tools/personalized-advice',
      icon: <Brain className="w-10 h-10 text-purple-500" />,
      color: 'bg-purple-100',
      isAI: true
    },
    {
      title: 'Seasonal Care Guide',
      description: 'Optimize your plant care based on the current season and location',
      path: '/tools/seasonal-care',
      icon: <CloudSun className="w-10 h-10 text-blue-500" />,
      color: 'bg-blue-100',
      isAI: true
    },
    {
      title: 'Plant Arrangement Designer',
      description: 'Get suggestions for arranging your plants aesthetically and functionally',
      path: '/tools/plant-arrangement',
      icon: <PanelTop className="w-10 h-10 text-teal-500" />,
      color: 'bg-teal-100',
      isAI: true
    },
    {
      title: 'Journal Writing Assistant',
      description: 'Transform your care logs into detailed journal entries',
      path: '/tools/journal-generator',
      icon: <BookOpen className="w-10 h-10 text-indigo-500" />,
      color: 'bg-indigo-100', 
      isAI: true
    },
    {
      title: 'Growth Analyzer',
      description: 'Track and analyze your plant\'s growth over time with photos',
      path: '/tools/growth-analyzer',
      icon: <BarChart className="w-10 h-10 text-emerald-500" />,
      color: 'bg-emerald-100',
      isAI: true
    },
    {
      title: 'Plant Care Expert',
      description: 'Ask questions and get expert answers about plant care',
      path: '/tools/plant-expert',
      icon: <Search className="w-10 h-10 text-amber-500" />,
      color: 'bg-amber-100',
      isAI: true
    },
    {
      title: 'Care Schedule Optimizer',
      description: 'Generate an optimized care schedule for your plant collection',
      path: '/tools/care-scheduler',
      icon: <Calendar className="w-10 h-10 text-orange-500" />,
      color: 'bg-orange-100',
      isAI: true
    },
    {
      title: 'Community Insights',
      description: 'Discover best practices from the plant care community',
      path: '/tools/community-insights',
      icon: <Users className="w-10 h-10 text-pink-500" />,
      color: 'bg-pink-100',
      isAI: true
    }
  ];
  
  // Combine all tools
  const tools = [...basicTools, ...aiTools];

  return (
    <MainLayout>
      <div className="p-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Garden Tools</h1>
          <p className="text-muted-foreground">
            Specialized tools to help with your gardening tasks
          </p>
        </div>

        {/* Basic Tools Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Essential Tools</h2>
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

        {/* AI Tools Section */}
        <div>
          <div className="flex items-center mb-4">
            <h2 className="text-xl font-semibold">AI-Powered Features</h2>
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
      </div>
    </MainLayout>
  );
}