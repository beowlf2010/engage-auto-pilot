
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Calendar, DollarSign, Eye, Car, QrCode } from "lucide-react";
import { Link } from "react-router-dom";
import VehicleIdentifier from "@/components/shared/VehicleIdentifier";
import { formatVehicleTitle, getVehicleDescription, formatPrice, getVehicleStatusDisplay } from "@/services/inventory/vehicleFormattingService";

interface InventoryTableProps {
  inventory: any[] | undefined;
  isLoading: boolean;
  onSort: (sortBy: string) => void;
  openCompletenessModal: (vehicle: any) => void;
  onQRCode: (vehicle: any) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({
  inventory,
  isLoading,
  onSort,
  openCompletenessModal,
  onQRCode,
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50">
          <TableHead className="font-semibold">
            <Button variant="ghost" size="sm" onClick={() => onSort('make')} className="p-0 h-auto font-semibold">
              Vehicle <ArrowUpDown className="w-3 h-3 ml-1" />
            </Button>
          </TableHead>
          <TableHead className="font-semibold">Stock #</TableHead>
          <TableHead className="font-semibold">
            <Button variant="ghost" size="sm" onClick={() => onSort('price')} className="p-0 h-auto font-semibold">
              Price <ArrowUpDown className="w-3 h-3 ml-1" />
            </Button>
          </TableHead>
          <TableHead className="font-semibold">Status</TableHead>
          <TableHead className="font-semibold">
            <Button variant="ghost" size="sm" onClick={() => onSort('age')} className="p-0 h-auto font-semibold">
              Age <ArrowUpDown className="w-3 h-3 ml-1" />
            </Button>
          </TableHead>
          <TableHead className="font-semibold">Features</TableHead>
          <TableHead className="font-semibold">Deal History</TableHead>
          <TableHead className="font-semibold">
            <Button variant="ghost" size="sm" onClick={() => onSort('completeness')} className="p-0 h-auto font-semibold">
              Data Quality <ArrowUpDown className="w-3 h-3 ml-1" />
            </Button>
          </TableHead>
          <TableHead className="font-semibold">QR Code</TableHead>
          <TableHead className="font-semibold">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 10 }).map((_, j) => (
                <TableCell key={j}><div className="h-4 bg-slate-200 rounded animate-pulse"></div></TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          inventory?.map((vehicle) => {
            const vehicleDescription = getVehicleDescription(vehicle);
            const statusDisplay = getVehicleStatusDisplay(vehicle);

            return (
              <TableRow key={vehicle.id} className="hover:bg-slate-50">
                <TableCell>
                  <div>
                    <div className="font-medium text-slate-800">
                      {formatVehicleTitle(vehicle)}
                    </div>
                    {vehicle.color_exterior && (
                      <div className="text-sm text-slate-600">{vehicle.color_exterior}</div>
                    )}
                    {vehicleDescription && (
                      <div className="text-xs text-slate-500 mt-1">{vehicleDescription}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <VehicleIdentifier
                    stockNumber={vehicle.stock_number}
                    vin={vehicle.vin}
                    variant="badge"
                    showIcon={true}
                  />
                  {vehicle.source_report === 'orders_all' && !vehicle.vin && (
                    <div className="text-xs text-slate-500 mt-1">GM Global Order</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-semibold text-slate-800">
                    {formatPrice(vehicle.price)}
                  </div>
                  {vehicle.msrp && vehicle.msrp !== vehicle.price && (
                    <div className="text-sm text-slate-500 line-through">
                      MSRP: {formatPrice(vehicle.msrp)}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={statusDisplay.color}>
                    {statusDisplay.label}
                  </Badge>
                  {vehicle.expected_sale_date && (
                    <div className="text-xs text-slate-500 mt-1 flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      ETA: {new Date(vehicle.expected_sale_date).toLocaleDateString()}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {vehicle.days_in_inventory !== null ? (
                      <div>{vehicle.days_in_inventory} days</div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                    {vehicle.leads_count > 0 && (
                      <div className="text-blue-600">{vehicle.leads_count} leads</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {vehicle.rpo_codes && vehicle.rpo_codes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {vehicle.rpo_codes.slice(0, 3).map((code) => (
                        <Badge key={code} variant="outline" className="text-xs">
                          {code}
                        </Badge>
                      ))}
                      {vehicle.rpo_codes.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{vehicle.rpo_codes.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {vehicle.deal_count > 0 ? (
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-xs">
                          {vehicle.deal_count} deal{vehicle.deal_count > 1 ? 's' : ''}
                        </Badge>
                        {vehicle.latest_deal && (
                          <div className="text-xs text-slate-600">
                            <div className="flex items-center space-x-1">
                              <DollarSign className="w-3 h-3" />
                              <span>
                                {vehicle.latest_deal.sale_amount
                                  ? formatPrice(vehicle.latest_deal.sale_amount)
                                  : 'No sale price'
                                }
                              </span>
                            </div>
                            <div className="text-slate-500">
                              {new Date(vehicle.latest_deal.upload_date).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 text-xs">No deals</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      className="focus:outline-none"
                      onClick={() => openCompletenessModal(vehicle)}
                      title="View completeness details"
                    >
                      <Badge
                        variant="outline"
                        className={`text-xs cursor-pointer hover:scale-105 transition ${
                          vehicle.data_completeness >= 80
                            ? "bg-green-50 text-green-700 border-green-200"
                            : vehicle.data_completeness >= 60
                              ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                              : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {vehicle.data_completeness}%
                      </Badge>
                    </button>
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Print QR Code"
                    onClick={() => onQRCode(vehicle)}
                  >
                    <QrCode className="w-5 h-5" />
                  </Button>
                </TableCell>
                <TableCell>
                  <Link to={`/vehicle-detail/${vehicle.stock_number || vehicle.vin || vehicle.id}`}>
                    <Button variant="outline" size="sm" className="flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
};

export default InventoryTable;
