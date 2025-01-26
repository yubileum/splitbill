"use client"

import React, { useRef, useState, useEffect } from 'react';
import { 
  PlusCircle,
  Trash2,
  Globe,
  ChevronDown, 
  Percent, 
  DollarSign, 
  //Users, 
  UserPlus,
  MoreVertical,
  Split,
  Tag,
  CircleDollarSign, 
  CircleDot,
} from 'lucide-react';

type Currency = {
  code: string;
  symbol: string;
  name: string;
};

type Member = {
  id: number;
  name: string;
  color: string;
};

type Item = {
  id: number;
  name: string;
  price: string;
  qty: number;
  sharedQty: number;
  splits: Split[];
  discount: Discount;
  isPriceTotal: boolean;  
};

type Split = {
  memberId: number;
  quantity: number;
};

type Fee = {
  id: number;
  name: string;
  value: string;
  type: 'percentage' | 'amount';
};

type PopupState = {
  itemId: number | null;
  type: string | null;
};

type Discount = {
  type: 'percentage' | 'amount';
  value: number;
};

type OverallDiscount = {
  value: string;
  type: 'percentage' | 'amount';
};

const BillCalculator = () => {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>({ 
    code: 'IDR', 
    symbol: 'Rp', 
    name: 'Indonesian Rupiah' 
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [additionalFees, setAdditionalFees] = useState<Fee[]>([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newFee, setNewFee] = useState<Omit<Fee, 'id'>>({ 
    name: '', 
    value: '', 
    type: 'percentage' as const 
  });
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [itemMenuOpen, setItemMenuOpen] = useState<number | null>(null);
  const [activePopup, setActivePopup] = useState<PopupState>({ itemId: null, type: null });
  const [tempSharedQty, setTempSharedQty] = useState(1);
  const [tempDiscount, setTempDiscount] = useState<Discount>({ type: 'percentage', value: 0 });
  const lastItemRef = useRef<HTMLDivElement>(null);
  const membersRef = useRef<HTMLDivElement>(null);
  const additionalFeesRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [overallDiscount, setOverallDiscount] = useState<OverallDiscount>({
    value: '',
    type: 'percentage'
  });
  const [expandedMembers, setExpandedMembers] = useState<Set<number>>(new Set());

  const scrollToElement = (ref: React.RefObject<HTMLDivElement | null>): void => {
    if (ref.current) {
        ref.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
    }
  };


  const currencies = [
    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' }
  ];

  const memberColors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500'
  ];

  const formatCurrency = (amount: number): string => {
    if (typeof amount !== 'number' || isNaN(amount)) return `${selectedCurrency.symbol}0`;
    return selectedCurrency.code === 'IDR' 
      ? `${selectedCurrency.symbol} ${Math.round(amount).toLocaleString()}`
      : `${selectedCurrency.symbol}${amount.toFixed(2)}`;
  };

  // const togglePriceMode = (itemId: number): void => {
  //   setItems(items.map(item => {
  //     if (item.id === itemId) {
  //       const newIsPriceTotal = !item.isPriceTotal;
  //       // Convert the price when toggling
  //       const newPrice = newIsPriceTotal 
  //         ? item.price * item.qty  // Convert to total
  //         : item.price / item.qty; // Convert to per item
  //       return {
  //         ...item,
  //         isPriceTotal: newIsPriceTotal,
  //         price: newPrice
  //       };
  //     }
  //     return item;
  //   }));
  // };

  const addMember = (): void => {
    if (newMemberName.trim()) {
      setMembers([...members, {
        id: Date.now(),
        name: newMemberName.trim(),
        color: memberColors[members.length % memberColors.length]
      }]);
      setNewMemberName('');
    }
  };
  
  const removeMember = (id: number): void => {
    setMembers(members.filter(member => member.id !== id));
    setItems(items.map(item => ({
      ...item,
      splits: item.splits?.filter(split => split.memberId !== id) || []
    })));
  };

  const addItem = (): void => {
    const newItemId = Date.now();
    setItems([
      ...items,
      {
        id: newItemId,
        name: '',
        price: '',  // Initialize as empty string
        qty: 1,
        sharedQty: 1,
        splits: [] as Split[],
        discount: { type: 'percentage', value: 0 },
        isPriceTotal: true
      }
    ]);
  
    setTimeout(() => {
      if (lastItemRef.current instanceof HTMLElement) {
        lastItemRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 100);
  };

  const updateItem = (id: number, field: keyof Item, value: string | number): void => {
    setItems(items.map(item => {
      if (item.id === id) {
        if (field === 'price') {
          return {
            ...item,
            [field]: value.toString() // Keep the string value as is
          };
        }
        
        if (field === 'qty') {
          const numValue = parseFloat(value.toString());
          if (isNaN(numValue) || value === '') {
            return {
              ...item,
              qty: 1
            };
          }
          const maxQty = item.sharedQty > 1 ? item.sharedQty : Infinity;
          return {
            ...item,
            qty: Math.max(1, Math.min(numValue, maxQty))
          };
        }
        
        return {
          ...item,
          [field]: value
        };
      }
      return item;
    }));
  };

  const updateItemSplit = (itemId: number, memberId: number, quantity: number): void => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const parsedQuantity = Math.max(0, Math.floor(Number(quantity) || 0)); // Nilai baru untuk split
        const currentSplit = item.splits.find(s => s.memberId === memberId);
        const otherSplitsTotal = item.splits
          .filter(s => s.memberId !== memberId)
          .reduce((sum, s) => sum + s.quantity, 0);
  
        // Tentukan batas maksimum berdasarkan sharedQty atau qty
        const maxAllowedQuantity = item.sharedQty > 1
          ? item.sharedQty - otherSplitsTotal
          : item.qty - otherSplitsTotal;
  
        // Validasi nilai quantity
        const newQuantity = Math.min(parsedQuantity, maxAllowedQuantity);
  
        // Perbarui splits array
        const newSplits = currentSplit
          ? item.splits.map(s =>
              s.memberId === memberId ? { ...s, quantity: newQuantity } : s
            )
          : [...item.splits, { memberId, quantity: newQuantity }];
  
        return { ...item, splits: newSplits }; // Hanya memperbarui splits
      }
      return item;
    }));
  };  

  const updateItemSharedQty = (itemId: number): void => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
  
    // Number of portions to share (tempSharedQty will be 3 in your pizza example)
    const newSharedQty = Math.max(1, Math.min(
      Math.floor(Number(tempSharedQty) || 1),
      20 // Setting a reasonable maximum number of shares
    ));
    
    setItems(items.map(currentItem => {
      if (currentItem.id === itemId) {
        // Reset splits when changing share quantity
        return {
          ...currentItem,
          sharedQty: newSharedQty,
          splits: [] // Reset splits when changing number of shares
        };
      }
      return currentItem;
    }));
    setActivePopup({ itemId: null, type: null });
  };

  const handleShareClick = (item: Item): void => {
    setTempSharedQty(item.sharedQty || 1);
    setActivePopup({ itemId: item.id, type: 'share' });
    setItemMenuOpen(null);
  };

  const updateItemDiscount = (itemId: number): void => {
    setItems(items.map(item => 
      item.id === itemId
        ? { ...item, discount: { type: tempDiscount.type, value: tempDiscount.value } }
        : item
    ));
    setActivePopup({ itemId: null, type: null });
  };

  const removeItem = (id: number): void => {
    setItems(items.filter(item => item.id !== id));
  };

  //Not Yet Used
  // const calculateOriginalItemTotal = (item) => {
  //   if (!item) return 0;
  //   const splitTotal = (item.splits || []).reduce((sum, split) => sum + (Number(split.quantity) || 0), 0);
  //   return splitTotal * (Number(item.price) || 0);
  // };

  const calculateItemPrice = (item: Item): number => {
    if (!item) return 0;
    let basePrice = parseFloat(item.price) || 0;
    
    // If price is per item and qty > 1, adjust for total price
    if (!item.isPriceTotal) {
      basePrice = basePrice * item.qty;
    }
    
    const discount = Number(item.discount?.value) || 0;
    let priceAfterDiscount = basePrice;
    
    // Apply discount
    if (item.discount?.type === 'percentage') {
      priceAfterDiscount = basePrice * (1 - Math.min(100, Math.max(0, discount)) / 100);
    } else {
      priceAfterDiscount = Math.max(0, basePrice - discount);
    }

    if (Number(item.sharedQty) > 1) {
      return priceAfterDiscount / item.sharedQty;
    }
    
    return priceAfterDiscount;
  };
  
  const calculateItemDiscountAmount = (item: Item): number => {
    if (!item || !item.discount?.value) return 0;

    let basePrice = parseFloat(item.price) || 0;
    
    // If price is per item, calculate total price first
    if (!item.isPriceTotal) {
      basePrice = basePrice * item.qty;
    }
    
    const discountValue = Number(item.discount.value) || 0;

    if (item.discount.type === 'percentage') {
      return basePrice * (discountValue / 100);
    }
    return discountValue;
  };

  const removeItemDiscount = (itemId: number): void => {
    setItems(items.map(item => 
      item.id === itemId
        ? { ...item, discount: { type: 'percentage', value: 0 } }
        : item
    ));
    setActivePopup({ itemId: null, type: null });
  };
  
  const calculateSubtotal = (): number => {
    return items.reduce((sum, item) => {
      let itemPrice = parseFloat(item.price) || 0;
      
      // If it's per item price, multiply by quantity
      if (!item.isPriceTotal) {
        itemPrice = itemPrice * item.qty;
      }
      
      // For shared items
      if (Number(item.sharedQty) > 1) {
        return sum + itemPrice;
      }
      
      // For regular items
      return sum + itemPrice;
    }, 0);
  };

  const calculateTotal = (): number => {
    const subtotal = calculateSubtotal();
    
    // Calculate item-level discounts
    const itemDiscounts = items.reduce((sum, item) => {
      return sum + calculateItemDiscountAmount(item);
    }, 0);
  
    const subtotalAfterItemDiscounts = subtotal - itemDiscounts;
    
    // Calculate overall discount
    const overallDiscountAmount = calculateOverallDiscountAmount(subtotalAfterItemDiscounts);
    
    // Calculate additional fees on amount after all discounts
    const totalWithFees = additionalFees.reduce((total, fee) => {
      const value = parseFloat(fee.value) || 0;
      return fee.type === 'percentage'
        ? total + ((subtotalAfterItemDiscounts - overallDiscountAmount) * value / 100)
        : total + value;
    }, subtotalAfterItemDiscounts - overallDiscountAmount);
  
    return totalWithFees;
  };

  const calculateMemberShare = (memberId: number): number => {
    let memberSubtotal = 0;
  
    // Calculate member's item totals
    items.forEach(item => {
      const split = item.splits.find(s => s.memberId === memberId) ?? { 
        memberId: memberId, 
        quantity: 0 
      };
  
      if (split.quantity > 0) {
        let itemPrice = Number(item.price) || 0;
        
        if (!item.isPriceTotal) {
          itemPrice = itemPrice * item.qty;
        }
  
        // Apply item discount
        const discount = Number(item.discount?.value) || 0;
        let priceAfterDiscount = itemPrice;
        
        if (item.discount?.type === 'percentage') {
          priceAfterDiscount = itemPrice * (1 - Math.min(100, Math.max(0, discount)) / 100);
        } else {
          priceAfterDiscount = Math.max(0, itemPrice - discount);
        }
  
        // Calculate member's share
        if (Number(item.sharedQty) > 1) {
          const pricePerShare = priceAfterDiscount / item.sharedQty;
          memberSubtotal += pricePerShare * split.quantity;
        } else {
          const totalItemSplits = item.splits.reduce((sum, s) => sum + s.quantity, 0);
          if (totalItemSplits > 0) {
            memberSubtotal += (priceAfterDiscount * split.quantity) / totalItemSplits;
          }
        }
      }
    });
  
    // Apply overall discount proportionally
    const totalBeforeOverallDiscount = calculateSubtotal() - items.reduce((sum, item) => 
      sum + calculateItemDiscountAmount(item), 0
    );
    
    if (memberSubtotal > 0 && totalBeforeOverallDiscount > 0) {
      const memberRatio = memberSubtotal / totalBeforeOverallDiscount;
      const overallDiscountAmount = calculateOverallDiscountAmount(totalBeforeOverallDiscount);
      memberSubtotal -= overallDiscountAmount * memberRatio;
  
      // Apply additional fees
      additionalFees.forEach(fee => {
        const feeValue = parseFloat(fee.value) || 0;
        if (fee.type === 'percentage') {
          memberSubtotal += (memberSubtotal * (feeValue / 100));
        } else {
          memberSubtotal += feeValue / members.length;
        }
      });
    }
  
    return memberSubtotal;
  };

  const addFee = (): void => {
    if (newFee.name && newFee.value) {
      const newFeeWithId: Fee = {
        ...newFee,
        id: Date.now(),
        type: newFee.type as 'percentage' | 'amount'
      };
      
      setAdditionalFees([...additionalFees, newFeeWithId]);
      setNewFee({ name: '', value: '', type: newFee.type });
      
      if (additionalFeesRef.current) {
        setTimeout(() => scrollToElement(additionalFeesRef), 100);
      }
    }
  };

  const calculateOverallDiscountAmount = (subtotalAfterItemDiscounts: number): number => {
    const value = parseFloat(overallDiscount.value) || 0;
    if (value <= 0) return 0;
    
    return overallDiscount.type === 'percentage'
      ? subtotalAfterItemDiscounts * (value / 100)
      : Math.min(value, subtotalAfterItemDiscounts);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (!event.target || !(event.target instanceof Element)) return;
      if (!event.target.closest('.currency-dropdown')) {
        setIsCurrencyDropdownOpen(false);
      }
      if (!event.target.closest('.item-menu') && !event.target.closest('.item-menu-trigger')) {
        setItemMenuOpen(null);
      }
    };
  
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-2 sm:p-4 md:p-8 text-white">
      <div className="sticky top-0 z-50 mb-4 flex justify-end">
        <div className="relative currency-dropdown">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 backdrop-blur rounded-lg hover:bg-gray-700/80"
            onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
          >
            <Globe size={16} />
            {selectedCurrency.code}
            <ChevronDown size={16} />
          </button>
          
          {isCurrencyDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 py-2 bg-gray-800 rounded-lg shadow-xl z-50">
              {currencies.map(currency => (
                <button
                  key={currency.code}
                  className="w-full px-4 py-2 text-left hover:bg-gray-700/50"
                  onClick={() => {
                    setSelectedCurrency(currency);
                    setIsCurrencyDropdownOpen(false);
                  }}
                >
                  {currency.name} ({currency.symbol})
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Split Bill Calculator</h1>
          <p className="text-gray-400">Simple and accurate bill splitting</p>
        </div>

        {/* Members Section */}
        <div ref={membersRef} className="bg-gray-800/50 rounded-xl p-4 sm:p-6 space-y-4">
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-semibold">Members</h2>
          <div className="flex gap-2 w-full">
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addMember()}
              placeholder="Add member name"
              className="flex-1 bg-gray-700/50 rounded-lg px-3 py-2 text-sm sm:text-base min-w-0"
            />
            <button
              onClick={addMember}
              className="p-2 text-blue-400 hover:text-blue-300"
            >
              <UserPlus size={20} />
            </button>
          </div>
        </div>

          <div className="flex flex-wrap gap-2">
            {members.map(member => (
              <div
                key={member.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700/30"
              >
                <div className={`w-6 h-6 rounded-full ${member.color} flex items-center justify-center`}>
                  {member.name[0].toUpperCase()}
                </div>
                <span>{member.name}</span>
                <button
                  onClick={() => removeMember(member.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-gray-800/50 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Items</h2>
            <button
              onClick={addItem}
              disabled={members.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusCircle size={16} />
              Add Item
            </button>
          </div>

          <div className="space-y-4">
          {items.map((item, index) => (
            <div 
              key={item.id}
              ref={index === items.length - 1 ? lastItemRef : null}
              className="space-y-3 bg-gray-700/30 p-4 rounded-lg relative"
            >
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Row 1: Item Name & Quantity */}
                  <div className="flex gap-2 flex-1">
                    {/* Item Name Field */}
                    <input
                      type="text"
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                      className="flex-1 bg-gray-700/50 rounded-lg px-2 py-2 text-sm min-w-0"
                    />

                    {/* Quantity with Increment/Decrement Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.qty > 1) {
                            updateItem(item.id, 'qty', item.qty - 1);
                          }
                        }}
                        className={`w-6 h-6 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          item.qty <= 1 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        aria-label="Decrease Quantity"
                        disabled={item.qty <= 1}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={item.qty}
                        min="1"
                        max={Number(item.sharedQty) || 1}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          const parsedValue = parseInt(inputValue, 10);
                          if (inputValue === '') {
                            updateItem(item.id, 'qty', 0);
                          } else {
                            updateItem(item.id, 'qty', Math.min(parsedValue, item.sharedQty || parsedValue));
                          }
                        }}
                        className="w-12 text-center bg-gray-700/50 text-sm px-1 py-1 rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const maxQty = item.sharedQty > 1 ? item.sharedQty : item.qty + 1;
                          updateItem(item.id, 'qty', Math.min(item.qty + 1, maxQty));
                        }}
                        className={`w-6 h-6 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          item.qty >= (item.sharedQty > 1 ? item.sharedQty : Infinity) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        aria-label="Increase Quantity"
                        disabled={item.qty >= (item.sharedQty > 1 ? item.sharedQty : Infinity)}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Price, Delete & Three Dots */}
                  <div className="flex gap-2 items-center">
                    {/* Price Field with Toggle */}
                    <div className="flex-1 relative">
                    <input
                      type="number"
                      placeholder="Price"
                      value={item.price}
                      onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                      min="0"
                      className="w-full bg-gray-700/50 rounded-lg px-2 py-2 pr-28 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                      <div className="absolute right-0 top-0 h-full flex items-center">
                        <button
                          onClick={() => setItems(items.map(i => 
                            i.id === item.id ? {...i, isPriceTotal: !i.isPriceTotal} : i
                          ))}
                          disabled={item.qty <= 1}
                          className={`px-2 h-full flex items-center gap-1 ${
                            item.qty <= 1 
                              ? 'opacity-50 cursor-not-allowed' 
                              : 'hover:text-blue-400'
                          }`}
                          title={item.isPriceTotal ? "Total Price" : "Per Item Price"}
                        >
                          {item.isPriceTotal ? (
                            <>
                              <span className="text-xs text-gray-400">price in total</span>
                              <CircleDollarSign size={14} className="text-blue-400" />
                            </>
                          ) : (
                            <>
                              <span className="text-xs text-gray-400">price per item</span>
                              <CircleDot size={14} className="text-gray-400" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons Container */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-gray-700/50 rounded-lg"
                        aria-label="Delete Item"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="relative item-menu">
                        <button
                          onClick={() => setItemMenuOpen(itemMenuOpen === item.id ? null : item.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg item-menu-trigger"
                        >
                          <MoreVertical size={14} />
                        </button>
                        {itemMenuOpen === item.id && (
                          <div className="absolute right-0 mt-2 w-48 py-2 bg-gray-800 rounded-lg shadow-xl z-10">
                          <button
                            className="w-full px-4 py-2 text-left hover:bg-gray-700/50 flex items-center gap-2"
                            onClick={() => handleShareClick(item)}
                          >
                            <Split size={14} />
                            Share Item
                          </button>
                          <button
                            className="w-full px-4 py-2 text-left hover:bg-gray-700/50 flex items-center gap-2"
                            onClick={() => {
                              setTempDiscount({
                                type: item.discount?.type || 'percentage',
                                value: item.discount?.value || 0
                              });
                              setActivePopup({ itemId: item.id, type: 'discount' });
                              setItemMenuOpen(null);
                            }}
                          >
                            <Tag size={14} />
                            {item.discount && Number(item.discount.value) > 0 ? 'Edit Discount' : 'Add Discount'}
                          </button>
                        </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>


                {/* Display shared quantity and discount if applied */}
                {(Number(item.sharedQty) > 1 || Number(item.discount?.value) > 0) && (
                  <div className="flex flex-col gap-1 text-sm text-gray-400 mt-1 bg-gray-700/20 p-2 rounded-lg">
                    {Number(item.sharedQty) > 1 && (
                      <div className="flex justify-between">
                        <span>Shared between {item.sharedQty} people</span>
                        <span>{formatCurrency((Number(item.price) || 0) / item.sharedQty)} per share</span>
                      </div>
                    )}
                    {Number(item.discount?.value) > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span>Original price:</span>
                          <span>{formatCurrency(Number(item.price) || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Discount ({item.discount?.type === 'percentage' 
                            ? `${Number(item.discount.value).toFixed(0)}%` 
                            : formatCurrency(Number(item.discount.value) || 0)}):</span>
                          <span>-{formatCurrency(
                            item.discount?.type === 'percentage' 
                              ? ((Number(item.price) || 0) * (Math.min(100, Math.max(0, Number(item.discount.value))) / 100))
                              : Math.min(Number(item.price) || 0, Number(item.discount.value) || 0)
                          )}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Final price:</span>
                          <span>{formatCurrency(calculateItemPrice(item))}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Members Section for Splitting */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {members.map((member) => {
                    const split = item.splits.find((s) => s.memberId === member.id) ?? { memberId: member.id, quantity: 0 };
                    const isActive = split.quantity > 0;

                    return (
                      <div 
                        key={member.id} 
                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-gray-700/50 ring-1 ring-blue-500/50' 
                            : 'bg-gray-700/20'
                        }`}
                      >
                        {/* Member Initial - Keep color consistent */}
                        <div className={`w-6 h-6 rounded-full ${member.color} flex items-center justify-center`}>
                          {member.name[0].toUpperCase()}
                        </div>

                        {/* Member Name */}
                        <span className={`flex-grow text-sm ${
                          isActive ? 'text-white' : 'text-gray-400'
                        }`}>
                          {member.name}
                        </span>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateItemSplit(item.id, member.id, Math.max(0, split.quantity - 1))
                            }
                            className={`w-5 h-5 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              split.quantity === 0 ? 'opacity-50' : ''
                            }`}
                            aria-label="Decrease Quantity"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={split.quantity}
                            min="0"
                            max={item.sharedQty > 1 ? item.sharedQty : item.qty}
                            onChange={(e) => {
                              const parsedValue = Math.max(0, parseInt(e.target.value) || 0);
                              updateItemSplit(item.id, member.id, Math.min(parsedValue, item.sharedQty > 1 ? item.sharedQty : item.qty));
                            }}
                            className={`w-10 text-center bg-gray-700/50 text-xs px-1 py-1 rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                              isActive ? 'text-white' : 'text-gray-400'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const maxQty = item.sharedQty > 1 ? item.sharedQty : item.qty;
                              updateItemSplit(item.id, member.id, Math.min(split.quantity + 1, maxQty));
                            }}
                            className={`w-5 h-5 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                            aria-label="Increase Individual Quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Safe Share PopUp */}
                {activePopup.itemId === item.id && activePopup.type === 'share' && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 p-4 sm:p-6 rounded-xl w-full max-w-sm sm:w-96 space-y-4">
                      <h3 className="text-lg font-semibold">Share {item.name}</h3>
                      <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-sm text-gray-400 mb-1">Number of people sharing:</label>
                        <div className="flex items-center justify-center space-x-2">
                          {/* Decrement Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (tempSharedQty > 1) {
                                setTempSharedQty(tempSharedQty - 1);
                              }
                            }}
                            className="w-12 h-12 bg-gray-600 text-white text-xl rounded-full hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Decrease"
                            disabled={tempSharedQty <= 1} // Disable button when at minimum value
                          >
                            -
                          </button>

                          {/* Input Field */}
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={tempSharedQty}
                            onChange={(e) => {
                              const inputValue = parseInt(e.target.value) || 1;
                              setTempSharedQty(Math.min(Math.max(1, inputValue), 20));
                            }}
                            className="w-16 text-center bg-gray-700/50 text-lg px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            onWheel={(e) => {
                              (e.target as HTMLInputElement).blur();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === '-' || e.key === 'e' || e.key === '.') {
                                e.preventDefault();
                              }
                            }}
                          />

                          {/* Increment Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (tempSharedQty < 20) {
                                setTempSharedQty(tempSharedQty + 1);
                              }
                            }}
                            className="w-12 h-12 bg-gray-600 text-white text-xl rounded-full hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Increase"
                            disabled={tempSharedQty >= 20} // Disable button when at maximum value
                          >
                            +
                          </button>
                        </div>
                      </div>
                        <div className="text-sm bg-gray-700/20 p-3 rounded-lg space-y-2">
                          <div className="flex justify-between">
                            <span>Total item price:</span>
                            <span>{formatCurrency(Number(item.price) || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Price per share:</span>
                            <span>{formatCurrency((Number(item.price) || 0) / tempSharedQty)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                          onClick={() => setActivePopup({ itemId: null, type: null })}
                        >
                          Cancel
                        </button>
                        <button
                          className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
                          onClick={() => updateItemSharedQty(item.id)}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Discount Popup */}
                {activePopup.itemId === item.id && activePopup.type === 'discount' && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-gray-800 p-4 sm:p-6 rounded-xl w-full max-w-sm sm:w-96 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">
                      {item.discount && Number(item.discount.value) > 0 ? 'Edit Discount' : 'Add Discount'}
                    </h3>
                    {item.discount && Number(item.discount.value) > 0 && (
                      <button
                        onClick={() => removeItemDiscount(item.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                    <div className="space-y-4">
                      <div className="flex bg-gray-700/50 rounded-lg p-1">
                        <button
                          onClick={() => setTempDiscount({ ...tempDiscount, type: 'percentage' })}
                          className={`flex-1 px-3 py-1 rounded flex items-center justify-center gap-1 ${
                            tempDiscount.type === 'percentage' ? 'bg-blue-600' : ''
                          }`}
                        >
                          <Percent size={16} /> Percentage
                        </button>
                        <button
                          onClick={() => setTempDiscount({ ...tempDiscount, type: 'amount' })}
                          className={`flex-1 px-3 py-1 rounded flex items-center justify-center gap-1 ${
                            tempDiscount.type === 'amount' ? 'bg-blue-600' : ''
                          }`}
                        >
                          <DollarSign size={16} /> Amount
                        </button>
                      </div>
                      <input
                        type="number"
                        value={tempDiscount.value === 0 ? "" : tempDiscount.value}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          if (inputValue === "") {
                            setTempDiscount({ ...tempDiscount, value: 0 });
                          } else {
                            const parsedValue = parseFloat(inputValue) || 0;
                            setTempDiscount({ ...tempDiscount, value: Math.max(0, parsedValue) });
                          }
                        }}
                        min="0"
                        className="w-full bg-gray-700/50 rounded-lg px-3 py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder={tempDiscount.type === 'percentage' ? 'Percentage' : 'Amount'}
                        onWheel={(e) => e.preventDefault()}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                        onClick={() => setActivePopup({ itemId: null, type: null })}
                      >
                        Cancel
                      </button>
                      <button
                        className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
                        onClick={() => updateItemDiscount(item.id)}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Overall Discount Section */}
        <div className="bg-gray-800/50 rounded-xl p-4 sm:p-6 space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold">Discount</h2>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Discount value"
              value={overallDiscount.value}
              onChange={(e) => setOverallDiscount({ ...overallDiscount, value: e.target.value })}
              className="flex-1 bg-gray-700/50 rounded-lg px-2 sm:px-3 py-2 text-sm sm:text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <div className="flex bg-gray-700/50 rounded-lg p-1">
              <button
                onClick={() => setOverallDiscount({ ...overallDiscount, type: 'percentage' })}
                className={`w-8 h-8 rounded flex items-center justify-center ${overallDiscount.type === 'percentage' ? 'bg-blue-600' : ''}`}
              >
                <Percent size={16} />
              </button>
              <button
                onClick={() => setOverallDiscount({ ...overallDiscount, type: 'amount' })}
                className={`w-8 h-8 rounded flex items-center justify-center ${overallDiscount.type === 'amount' ? 'bg-blue-600' : ''}`}
              >
                <DollarSign size={16} />
              </button>
            </div>
          </div>
          {parseFloat(overallDiscount.value) > 0 && (
            <div className="text-sm text-gray-400">
              Discount: {overallDiscount.type === 'percentage' ? `${overallDiscount.value}%` : formatCurrency(parseFloat(overallDiscount.value))}
            </div>
          )}
        </div>

        {/* Additional Fees Section */}
        <div ref={additionalFeesRef} className="bg-gray-800/50 rounded-xl p-4 sm:p-6 space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold">Additional Fees</h2>
          
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Fee name"
              value={newFee.name}
              onChange={(e) => setNewFee({ ...newFee, name: e.target.value })}
              className="flex-1 bg-gray-700/50 rounded-lg px-2 sm:px-3 py-2 text-sm sm:text-base min-w-0"
            />
            <input
              type="number"
              placeholder="Value"
              value={newFee.value}
              onChange={(e) => setNewFee({ ...newFee, value: e.target.value })}
              className="w-20 sm:w-24 bg-gray-700/50 rounded-lg px-2 py-2 text-sm sm:text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <div className="flex bg-gray-700/50 rounded-lg p-1">
            <button
              onClick={() => setNewFee({ ...newFee, type: 'percentage' })}
              className={`w-8 h-8 rounded flex items-center justify-center ${newFee.type === 'percentage' ? 'bg-blue-600' : ''}`}
            >
              <Percent size={16} />
            </button>
            <button
              onClick={() => setNewFee({ ...newFee, type: 'amount' })}
              className={`w-8 h-8 rounded flex items-center justify-center ${newFee.type === 'amount' ? 'bg-blue-600' : ''}`}
            >
              <DollarSign size={16} />
            </button>
            </div>
            <button
              onClick={addFee}
              className="p-1.5 sm:p-2 text-blue-400 hover:text-blue-300"
            >
              <PlusCircle size={20} />
            </button>
          </div>

          <div className="space-y-2">
            {additionalFees.map(fee => (
              <div key={fee.id} className="flex justify-between items-center bg-gray-700/30 rounded-lg px-4 py-2">
                <span>{fee.name}</span>
                <div className="flex items-center gap-4">
                  <span>
                    {fee.type === 'percentage' 
                      ? `${fee.value}%` 
                      : formatCurrency(parseFloat(fee.value))}
                  </span>
                  <button
                    onClick={() => setAdditionalFees(additionalFees.filter(f => f.id !== fee.id))}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Section */}
        <div ref={summaryRef} className="bg-gray-800/50 rounded-xl p-4 sm:p-6 space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold">Summary</h2>
          <div className="space-y-2">
            {/* Detailed Bills */}
            <div className="space-y-2 mb-4">
              <h3 className="font-semibold text-sm text-gray-400">Detailed Bills</h3>
              {items.map(item => {
                const itemTotal = item.isPriceTotal ? Number(item.price) : Number(item.price) * item.qty;
                return (
                  <div key={item.id} className="flex justify-between text-sm text-gray-400">
                    <div className="flex-1">
                      <span>{item.name || 'Unnamed item'}</span>
                      {!item.isPriceTotal && item.qty > 1 && (
                        <span className="text-gray-500"> × {item.qty}</span>
                      )}
                      {item.sharedQty > 1 && (
                        <span className="text-gray-500"> (shared by {item.sharedQty})</span>
                      )}
                    </div>
                    <div className="text-right">
                      {!item.isPriceTotal && item.qty > 1 && (
                        <span className="text-gray-500 mr-2">
                          {formatCurrency(Number(item.price))} each
                        </span>
                      )}
                      <span>{formatCurrency(itemTotal)}</span>
                    </div>
                  </div>
                );
              })}
              <div className="border-t border-gray-700 pt-2 flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(calculateSubtotal())}</span>
              </div>
            </div>
            {/* Discounts */}
            {items.some(item => Number(item.discount?.value) > 0) && (
              <div className="space-y-2">
                {items
                  .filter(item => Number(item.discount?.value) > 0)
                  .map(item => {
                    const discountAmount = calculateItemDiscountAmount(item);
                    return discountAmount > 0 ? (
                      <div key={item.id} className="flex justify-between text-sm text-gray-400">
                        <span>{item.name || 'Unnamed item'} discount:</span>
                        <span className="text-red-400">-{formatCurrency(discountAmount)}</span>
                      </div>
                    ) : null;
                  })}
                <div className="flex justify-between font-medium">
                  <span>Subtotal after discounts:</span>
                  <span>{formatCurrency(calculateSubtotal() - items.reduce((sum, item) => 
                    sum + calculateItemDiscountAmount(item), 0
                  ))}</span>
                </div>
              </div>
            )}
            {/* Overall discount */}
            {parseFloat(overallDiscount.value) > 0 && (
              <div className="flex justify-between text-sm text-gray-400">
                <span>Overall discount ({overallDiscount.type === 'percentage' ? `${overallDiscount.value}%` : 'fixed'}):</span>
                <span className="text-red-400">
                  -{formatCurrency(calculateOverallDiscountAmount(
                    calculateSubtotal() - items.reduce((sum, item) => sum + calculateItemDiscountAmount(item), 0)
                  ))}
                </span>
              </div>
            )}
            {/* Additional Fees */}
            {additionalFees.map(fee => (
              <div key={fee.id} className="flex justify-between text-gray-400">
                <span>{fee.name}:</span>
                <span>+{formatCurrency(
                  fee.type === 'percentage' 
                    ? (calculateSubtotal() - items.reduce((sum, item) => 
                        sum + calculateItemDiscountAmount(item), 0
                      )) * parseFloat(fee.value) / 100
                    : parseFloat(fee.value)
                )}</span>
              </div>
            ))}
            {/* Total */}
            <div className="flex justify-between text-xl font-bold pt-4 border-t border-gray-700">
              <span>Total:</span>
              <span>{formatCurrency(calculateTotal())}</span>
            </div>
          </div>

          {members.length > 0 && (
            <div className="pt-4 space-y-2 border-t border-gray-700">
              <h3 className="font-semibold text-base sm:text-lg">Individual Shares</h3>
              {members.map(member => {
                const share = calculateMemberShare(member.id);
                const isExpanded = expandedMembers.has(member.id);
                const memberItems = items.filter(item => 
                  item.splits.some(split => split.memberId === member.id && split.quantity > 0)
                );

                return (
                  <div key={member.id} className="space-y-2">
                    <div 
                      className="flex justify-between items-center cursor-pointer hover:bg-gray-700/30 rounded-lg p-2"
                      onClick={() => {
                        setExpandedMembers(prev => {
                          const newSet = new Set(prev);
                          if (isExpanded) {
                            newSet.delete(member.id);
                          } else {
                            newSet.add(member.id);
                          }
                          return newSet;
                        });
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full ${member.color} flex items-center justify-center`}>
                          {member.name[0].toUpperCase()}
                        </div>
                        <span>{member.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span>{formatCurrency(share)}</span>
                        <ChevronDown 
                          size={16} 
                          className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </div>
                    
                    {isExpanded && memberItems.length > 0 && (
                      <div className="ml-8 space-y-2 bg-gray-700/20 rounded-lg p-3">
                        {memberItems.map(item => {
                          const split = item.splits.find(s => s.memberId === member.id);
                          if (!split) return null;
                          
                          const itemTotal = item.isPriceTotal ? Number(item.price) : Number(item.price) * item.qty;
                          const sharePrice = (itemTotal / (item.sharedQty > 1 ? item.sharedQty : item.splits.reduce((sum, s) => sum + s.quantity, 0))) * split.quantity;
                          
                          return (
                            <div key={item.id} className="flex justify-between text-sm text-gray-400">
                              <div>
                                <span>{item.name || 'Unnamed item'}</span>
                                {item.sharedQty > 1 ? (
                                  <span className="text-gray-500"> ({split.quantity}/{item.sharedQty} shares)</span>
                                ) : (
                                  <span className="text-gray-500"> ({split.quantity} qty)</span>
                                )}
                              </div>
                              <span>{formatCurrency(sharePrice)}</span>
                            </div>
                          );
                        })}
                        
                        {additionalFees.length > 0 && (
                          <>
                            <div className="border-t border-gray-600 my-2"></div>
                            {additionalFees.map(fee => {
                              const baseAmount = calculateSubtotal() - items.reduce((sum, item) => sum + calculateItemDiscountAmount(item), 0);
                              const feeAmount = fee.type === 'percentage' 
                                ? (baseAmount * parseFloat(fee.value) / 100) / members.length
                                : parseFloat(fee.value) / members.length;
                              
                              return (
                                <div key={fee.id} className="flex justify-between text-sm text-gray-400">
                                  <span>{fee.name}</span>
                                  <span>{formatCurrency(feeAmount)}</span>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="pt-2 mt-2 border-t border-gray-700">
            <div className="flex justify-between items-center text-sm text-gray-400">
              <span>Total of individual shares:</span>
              <span>{formatCurrency(members.reduce((sum, member) => 
                sum + calculateMemberShare(member.id), 0
              ))}</span>
            </div>
            {Math.abs(calculateTotal() - members.reduce((sum, member) => sum + calculateMemberShare(member.id), 0)) > 0.01 && (
              <div className="flex justify-between items-center text-sm text-red-400 mt-1">
                <span>Difference from total:</span>
                <span>{formatCurrency(Math.abs(
                  calculateTotal() - members.reduce((sum, member) => sum + calculateMemberShare(member.id), 0)
                ))}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-4 text-center text-gray-400 text-sm">
        <p>Version 1.0.0</p>
        <p>Created by Michael Yubileum</p>
      </footer>
    </div>
  );
};

export default BillCalculator;
