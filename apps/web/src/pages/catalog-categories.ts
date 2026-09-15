import {
  Building2,
  FolderTree,
  Ruler,
  Truck,
  HardHat,
  Wallet,
} from 'lucide-react';

export const catalogCategories = [
  {
    id: 'LOCATION',
    title: 'Obras e depósitos',
    description:
      'Locais onde os materiais ficam armazenados ou são utilizados.',
    example: 'Ex.: Obra Centro, Almoxarifado central.',
    createLabel: 'Nova obra ou depósito',
    editLabel: 'Editar obra ou depósito',
    icon: Building2,
  },
  {
    id: 'SUPPLIER',
    title: 'Fornecedores',
    description:
      'Empresas e pessoas que fornecem materiais para a construtora.',
    example: 'Ex.: Loja de materiais, distribuidora de cimento.',
    createLabel: 'Novo fornecedor',
    editLabel: 'Editar fornecedor',
    icon: Truck,
  },
  {
    id: 'EMPLOYEE',
    title: 'Funcionários',
    description: 'Pessoas vinculadas às retiradas e solicitações de materiais.',
    example: 'Ex.: Pedreiro, encarregado, mestre de obras.',
    createLabel: 'Novo funcionário',
    editLabel: 'Editar funcionário',
    icon: HardHat,
  },
  {
    id: 'GROUP',
    title: 'Grupos de materiais',
    description: 'Categorias que ajudam a organizar e encontrar os materiais.',
    example: 'Ex.: Elétrica, hidráulica, ferramentas.',
    createLabel: 'Novo grupo',
    editLabel: 'Editar grupo',
    icon: FolderTree,
  },
  {
    id: 'UNIT',
    title: 'Unidades de medida',
    description: 'Como as quantidades dos materiais serão registradas.',
    example: 'Ex.: Unidade (un), metro (m), saco (sc).',
    createLabel: 'Nova unidade',
    editLabel: 'Editar unidade',
    icon: Ruler,
  },
  {
    id: 'COST_CENTER',
    title: 'Centros de custo',
    description:
      'Etapas ou setores da obra aos quais o consumo será associado.',
    example: 'Ex.: Fundação, acabamento, instalação elétrica.',
    createLabel: 'Novo centro de custo',
    editLabel: 'Editar centro de custo',
    icon: Wallet,
  },
] as const;

export type CatalogCategory = (typeof catalogCategories)[number];
