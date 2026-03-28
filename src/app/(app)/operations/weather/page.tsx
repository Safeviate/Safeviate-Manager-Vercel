'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Wind, Thermometer, Eye, Navigation, CloudLightning, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function WeatherPage() {
  const [icao, setIcao] = useState('');
  const [loading, setLoading] = useState(false);
  const [weatherData, setWeatherData] = useState<any | null>(null);
  const { toast } = useToast();

  const fetchWeather = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!icao.trim()) return;

    const station = icao.toUpperCase().trim();
    setLoading(true);

    try {
      const response = await fetch(`https://aviationweather.gov/api/data/metar?ids=${station}&format=json&taf=true`);
      if (!response.ok) throw new Error('Failed to fetch weather data.');
      const data = await response.json();

      if (data && data.length > 0) {
        setWeatherData(data[0]);
        toast({ title: 'Weather Updated', description: `Fetched latest METAR for ${station}` });
      } else {
        setWeatherData(null);
        toast({ variant: 'destructive', title: 'Station Not Found', description: `No recent METAR data found for ${station}.` });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error Fetching Data', description: error.message });
      setWeatherData(null);
    } finally {
      setLoading(false);
    }
  };

  const getFlightCategoryColor = (category?: string) => {
    switch (category) {
      case 'VFR': return 'bg-green-500 hover:bg-green-600 text-white';
      case 'MVFR': return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'IFR': return 'bg-red-500 hover:bg-red-600 text-white';
      case 'LIFR': return 'bg-purple-500 hover:bg-purple-600 text-white';
      default: return 'bg-gray-500 hover:bg-gray-600 text-white';
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-[1200px] w-full mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase">Weather Center</h2>
          <p className="text-muted-foreground text-sm font-bold uppercase tracking-wider mt-1">NOAA Aviation Weather API</p>
        </div>
        <form onSubmit={fetchWeather} className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Input 
            placeholder="Enter ICAO (e.g. KJFK, EGLL)" 
            value={icao}
            onChange={(e) => setIcao(e.target.value)}
            className="w-full sm:w-64 font-mono uppercase font-black"
            maxLength={4}
          />
          <Button type="submit" disabled={loading} className="w-full sm:w-auto font-black uppercase tracking-wider shrink-0 gap-2">
            {loading ? <span className="animate-spin text-lg">↻</span> : <Search className="w-4 h-4" />}
            {loading ? 'Fetching' : 'Search'}
          </Button>
        </form>
      </div>

      {!weatherData && !loading && (
        <Card className="border-dashed h-[300px] flex flex-col items-center justify-center p-6 mt-8 shadow-none bg-muted/10">
          <CloudLightning className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-black uppercase tracking-widest text-center text-sm">Enter an ICAO code above to view current conditions.</p>
        </Card>
      )}

      {loading && (
        <div className="space-y-4 mt-8">
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-[120px] rounded-xl" />
            <Skeleton className="h-[120px] rounded-xl" />
            <Skeleton className="h-[120px] rounded-xl" />
          </div>
        </div>
      )}

      {weatherData && !loading && (
        <div className="space-y-6">
          <Card className="border-l-4 border-l-primary overflow-hidden shadow-sm">
             <div className="p-6 pb-4 border-b bg-muted/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h3 className="text-4xl font-black tracking-tighter uppercase">{weatherData.icaoId}</h3>
                  <p className="text-muted-foreground font-bold text-sm tracking-wider uppercase flex items-center gap-2 mt-1">
                    <Navigation className="w-3.5 h-3.5" /> 
                    {weatherData.name || 'Station'} METAR
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={`text-base font-black px-4 py-1 uppercase tracking-widest shadow-sm ${getFlightCategoryColor(weatherData.fltcat)}`}>
                    {weatherData.fltcat || 'UNKNOWN'}
                  </Badge>
                  <span className="text-xs font-bold text-muted-foreground">OBS: {new Date(weatherData.obsTime).toLocaleString()}</span>
                </div>
             </div>
             
             <CardContent className="p-0">
               <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x border-b">
                 
                 <div className="p-6 flex flex-col items-center justify-center text-center hover:bg-muted/5 transition-colors">
                    <Wind className="w-6 h-6 text-blue-500 mb-2" />
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Wind</span>
                    <p className="text-lg font-black text-foreground">
                      {weatherData.wdir === 'VRB' ? 'VRB' : weatherData.wdir ? `${weatherData.wdir}°` : 'CALM'} 
                      {weatherData.wspd ? ` @ ${weatherData.wspd}kt` : ''}
                    </p>
                    {weatherData.wgst && <p className="text-xs font-bold text-destructive uppercase">Gusts {weatherData.wgst}kt</p>}
                 </div>

                 <div className="p-6 flex flex-col items-center justify-center text-center hover:bg-muted/5 transition-colors">
                    <Eye className="w-6 h-6 text-amber-500 mb-2" />
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Visibility</span>
                    <p className="text-lg font-black text-foreground">{weatherData.visib != null ? `${weatherData.visib} SM` : 'N/A'}</p>
                 </div>

                 <div className="p-6 flex flex-col items-center justify-center text-center hover:bg-muted/5 transition-colors">
                    <Thermometer className="w-6 h-6 text-orange-500 mb-2" />
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Temp / Dew</span>
                    <p className="text-lg font-black text-foreground">
                      {weatherData.temp != null ? `${weatherData.temp}°C` : 'N/A'} / {weatherData.dewp != null ? `${weatherData.dewp}°C` : 'N/A'}
                    </p>
                 </div>

                 <div className="p-6 flex flex-col items-center justify-center text-center hover:bg-muted/5 transition-colors">
                    <Info className="w-6 h-6 text-purple-500 mb-2" />
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Altimeter</span>
                    <p className="text-lg font-black text-foreground">
                      {weatherData.altim != null ? `${weatherData.altim.toFixed(2)} inHg` : 'N/A'}
                    </p>
                 </div>
                 
               </div>
               
               <div className="p-6 bg-muted/10">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5 mb-2">RAW METAR</span>
                  <p className="font-mono text-sm font-medium p-4 bg-background border rounded-lg shadow-inner break-words">
                    {weatherData.rawOb}
                  </p>
               </div>
             </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
