
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Calendar, DollarSign, Eye, Car, QrCode, Brain, MapPin, Clock, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import VehicleIdentifier from "@/components/shared/VehicleIdentifier";
import { formatVehicleTitle, getVehicleDescription, formatPrice, getVehicleStatusDisplay } from "@/services/inventory/vehicleFormattingService";
import VehicleHotnessScore from "./VehicleHotnessScore";

interface InventoryTableProps {
  inventory: any[];
  isLoading: boolean;
  onSort: (sortBy: string) => void;
  openCompletenessModal: (vehicle: any) => void;
  onQRCode: (vehicle: any) => void;
}

const InventoryTable = ({ inventory, isLoading, onSort, openCompletenessModal, onQRCode }: InventoryTableProps) => {
  const formatDaysInInventory = (days: number) => {
    if (days <= 30) return { color: 'text-green-600', icon: <Zap className="w-3 h-3" /> };
    if (days <= 60) return { color: 'text-yellow-600', icon: <Clock className="w-3 h-3" /> };
    return { color: 'text-red-600', icon: <Clock className="w-3 h-3" /> };
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow className="hover:bg-slate-50">
            <TableHead className="font-semibold text-slate-700 py-4">
              <Button variant="ghost" size="sm" onClick={() => onSort('make')} className="p-0 h-auto font-semibold text-slate-700 hover:text-slate-900">
                <Car className="w-4 h-4 mr-2" />
                Vehicle <ArrowUpDown className="w-3 h-3 ml-1" />
              </Button>
            </TableHead>
            <TableHead className="font-semibold text-slate-700">Identification</TableHead>
            <TableHead className="font-semibold text-slate-700">
              <Button variant="ghost" size="sm" onClick={() => onSort('price')} className="p-0 h-auto font-semibold text-slate-700 hover:text-slate-900">
                <DollarSign className="w-4 h-4 mr-1" />
                Pricing <ArrowUpDown className="w-3 h-3 ml-1" />
              </Button>
            </TableHead>
            <TableHead className="font-semibold text-slate-700">Status</TableHead>
            <TableHead className="font-semibold text-slate-700">
              <Button variant="ghost" size="sm" onClick={() => onSort('age')} className="p-0 h-auto font-semibold text-slate-700 hover:text-slate-900">
                <Clock className="w-4 h-4 mr-1" />
                Age & Activity <ArrowUpDown className="w-3 h-3 ml-1" />
              </Button>
            </TableHead>
            <TableHead className="font-semibold text-slate-700">Features & History</TableHead>
            <TableHead className="font-semibold text-slate-700">
              <Button variant="ghost" size="sm" onClick={() => onSort('completeness')} className="p-0 h-auto font-semibold text-slate-700 hover:text-slate-900">
                Data Quality <ArrowUpDown className="w-3 h-3 ml-1" />
              </Button>
            </TableHead>
            <TableHead className="font-semibold text-slate-700">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onSort('hotness')}
                className="flex items-center space-x-1 hover:bg-transparent p-0 h-auto font-semibold text-slate-700 hover:text-slate-900"
              >
                <Brain className="w-4 h-4 text-purple-600" />
                <span>AI Score</span>
                <ArrowUpDown className="w-3 h-3" />
              </Button>
            </TableHead>
            <TableHead className="font-semibold text-slate-700 text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i} className="animate-pulse">
                {Array.from({ length: 9 }).map((_, j) => (
                  <TableCell key={j} className="py-4">
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    {j === 0 && <div className="h-3 bg-slate-100 rounded w-3/4 mt-2"></div>}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : inventory.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-12">
                <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-lg">No vehicles found</p>
                <p className="text-slate-400 text-sm">Try adjusting your filters</p>
              </TableCell>
            </TableRow>
          ) : (
            inventory.map((vehicle) => {
              const vehicleDescription = getVehicleDescription(vehicle);
              const statusDisplay = getVehicleStatusDisplay(vehicle);
              const ageFormatting = formatDaysInInventory(vehicle.days_in_inventory || 0);

              return (
                <TableRow key={vehicle.id} className="hover:bg-blue-50/50 transition-colors border-b border-slate-100">
                  {/* Vehicle Info */}
                  <TableCell className="py-4">
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-900 text-lg">
                        {formatVehicleTitle(vehicle)}
                      </div>
                      {vehicle.color_exterior && (
                        <div className="text-sm text-slate-600 flex items-center">
                          <div className="w-3 h-3 rounded-full bg-slate-300 mr-2 border"></div>
                          {vehicle.color_exterior}
                        </div>
                      )}
                      {vehicleDescription && (
                        <div className="text-xs text-slate-500 font-medium">{vehicleDescription}</div>
                      )}
                      {vehicle.mileage && (
                        <div className="text-xs text-slate-500">{vehicle.mileage.toLocaleString()} miles</div>
                      )}
                    </div>
                  </TableCell>

                  {/* Identification */}
                  <TableCell className="py-4">
                    <div className="space-y-2">
                      <VehicleIdentifier
                        stockNumber={vehicle.stock_number}
                        vin={vehicle.vin}
                        variant="badge"
                        showIcon={true}
                      />
                      {vehicle.source_report === 'orders_all' && !vehicle.vin && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          GM Global Order
                        </Badge>
                      )}
                      {vehicle.location && (
                        <div className="text-xs text-slate-500 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {vehicle.location}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Pricing */}
                  <TableCell className="py-4">
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900 text-lg">
                        {formatPrice(vehicle.price)}
                      </div>
                      {vehicle.msrp && vehicle.msrp !== vehicle.price && (
                        <div className="text-sm text-slate-500 line-through">
                          MSRP: {formatPrice(vehicle.msrp)}
                        </div>
                      )}
                      {vehicle.price && vehicle.msrp && vehicle.price < vehicle.msrp && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          ${(vehicle.msrp - vehicle.price).toLocaleString()} savings
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-4">
                    <div className="space-y-2">
                      <Badge className={`${statusDisplay.color} font-medium`}>
                        {statusDisplay.label}
                      </Badge>
                      {vehicle.expected_sale_date && (
                        <div className="text-xs text-slate-500 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          ETA: {new Date(vehicle.expected_sale_date).toLocaleDateString()}
                        </div>
                      )}
                      {vehicle.condition && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {vehicle.condition}
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Age & Activity */}
                  <TableCell className="py-4">
                    <div className="space-y-2">
                      {vehicle.days_in_inventory !== null && (
                        <div className={`flex items-center font-medium ${ageFormatting.color}`}>
                          {ageFormatting.icon}
                          <span className="ml-1">{vehicle.days_in_inventory} days</span>
                        </div>
                      )}
                      {vehicle.leads_count > 0 && (
                        <div className="text-blue-600 text-sm font-medium">
                          {vehicle.leads_count} lead{vehicle.leads_count > 1 ? 's' : ''}
                        </div>
                      )}
                      {vehicle.deal_count > 0 && (
                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                          {vehicle.deal_count} deal{vehicle.deal_count > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Features & History */}
                  <TableCell className="py-4">
                    <div className="space-y-2">
                      {vehicle.rpo_codes && vehicle.rpo_codes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {vehicle.rpo_codes.slice(0, 2).map((code) => (
                            <Badge key={code} variant="outline" className="text-xs bg-slate-50">
                              {code}
                            </Badge>
                          ))}
                          {vehicle.rpo_codes.length > 2 && (
                            <Badge variant="outline" className="text-xs bg-slate-50">
                              +{vehicle.rpo_codes.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {vehicle.latest_deal && (
                        <div className="text-xs text-slate-600 space-y-1">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-3 h-3" />
                            <span className="font-medium">
                              Last: {vehicle.latest_deal.sale_amount
                                ? formatPrice(vehicle.latest_deal.sale_amount)
                                : 'No amount'
                              }
                            </span>
                          </div>
                          <div className="text-slate-500">
                            {new Date(vehicle.latest_deal.upload_date).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Data Quality */}
                  <TableCell className="py-4">
                    <button
                      type="button"
                      className="focus:outline-none"
                      onClick={() => openCompletenessModal(vehicle)}
                      title="View completeness details"
                    >
                      <Badge
                        variant="outline"
                        className={`text-sm font-bold cursor-pointer hover:scale-105 transition-transform ${
                          vehicle.data_completeness >= 80
                            ? "bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                            : vehicle.data_completeness >= 60
                              ? "bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                              : "bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                        }`}
                      >
                        {vehicle.data_completeness}%
                      </Badge>
                    </button>
                  </TableCell>

                  {/* AI Score */}
                  <TableCell className="py-4">
                    <VehicleHotnessScore vehicleId={vehicle.id} compact />
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-4">
                    <div className="flex items-center space-x-2">
                      <Link to={`/vehicle-detail/${vehicle.stock_number || vehicle.vin || vehicle.id}`}>
                        <Button variant="outline" size="sm" className="flex items-center space-x-1 hover:bg-blue-50">
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Print QR Code"
                        onClick={() => onQRCode(vehicle)}
                        className="hover:bg-slate-100"
                      >
                        <QrCode className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default InventoryTable;
