
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, Edit, Trash2, Brain } from 'lucide-react';

interface RPOIntelligence {
  id: string;
  rpo_code: string;
  category: string;
  description: string;
  feature_type: string;
  mapped_value: string;
  confidence_score: number;
  learned_from_source: string[];
  vehicle_makes: string[];
  model_years: number[];
  created_at: string;
  updated_at: string;
}

const RPOIntelligenceTable = () => {
  const [rpoData, setRpoData] = useState<RPOIntelligence[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [filteredData, setFilteredData] = useState<RPOIntelligence[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchRPOIntelligence();
  }, []);

  useEffect(() => {
    filterData();
  }, [rpoData, searchTerm, categoryFilter]);

  const fetchRPOIntelligence = async () => {
    try {
      const { data, error } = await supabase
        .from('rpo_code_intelligence')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRpoData(data || []);
    } catch (error) {
      console.error('Error fetching RPO intelligence:', error);
      toast({
        title: "Error",
        description: "Failed to load RPO intelligence data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = [...rpoData];

    if (searchTerm) {
      filtered = filtered.filter(rpo => 
        rpo.rpo_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rpo.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rpo.mapped_value?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(rpo => rpo.category === categoryFilter);
    }

    setFilteredData(filtered);
  };

  const deleteRPO = async (id: string) => {
    try {
      const { error } = await supabase
        .from('rpo_code_intelligence')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "RPO mapping deleted successfully.",
      });

      fetchRPOIntelligence();
    } catch (error) {
      console.error('Error deleting RPO:', error);
      toast({
        title: "Error",
        description: "Failed to delete RPO mapping.",
        variant: "destructive"
      });
    }
  };

  const categories = ['all', 'engine', 'transmission', 'interior', 'exterior', 'package', 'option', 'safety', 'technology'];

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading RPO intelligence data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5" />
          <span>RPO Intelligence Database ({rpoData.length} entries)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex space-x-4 mb-6">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Search RPO codes, descriptions, or values..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-48">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RPO Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Mapped Value</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((rpo) => (
                <TableRow key={rpo.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {rpo.rpo_code}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {rpo.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {rpo.description}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {rpo.mapped_value || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge className={getConfidenceColor(rpo.confidence_score)}>
                      {Math.round(rpo.confidence_score * 100)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {rpo.learned_from_source?.map((source, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {source}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteRPO(rpo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchTerm || categoryFilter !== 'all' 
              ? 'No RPO codes match your search criteria.' 
              : 'No RPO intelligence data found. Start by adding some mappings!'
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RPOIntelligenceTable;
