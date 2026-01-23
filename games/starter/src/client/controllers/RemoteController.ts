import { ReplicatedStorage } from "@rbxts/services";
import { REMOTES } from "@rbx/net";
import { Controller } from "@rbx/core";
export const RemoteController: Controller & {
  Remotes: { Handshake: RemoteFunction; DoAction: RemoteFunction };
} = {
  Remotes: { Handshake: undefined!, DoAction: undefined! },
  onInit() {
    const folder = ReplicatedStorage.WaitForChild("Remotes", 30) as Folder;
    if (!folder) throw "Remotes folder not found";
    this.Remotes.Handshake = folder.WaitForChild(REMOTES.Handshake.name) as RemoteFunction;
    this.Remotes.DoAction = folder.WaitForChild(REMOTES.DoAction.name) as RemoteFunction;
  },
};
